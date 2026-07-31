import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types';
import {
  ChatMessageResponse,
  ChatProductPreview,
  SendChatMessage,
} from './chat.types';
import {
  ConversationMessage,
  ConversationService,
} from './conversation.service';
import { LlmMessage, LlmService } from './llm.service';
import { PromptService } from './prompt.service';
import { CHAT_TOOLS, ChatToolName } from './tools/tool-registry';
import { ToolDispatcher } from './tools/tool-dispatcher';

@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly llmService: LlmService,
    private readonly promptService: PromptService,
    private readonly toolDispatcher: ToolDispatcher,
  ) {}

  async send(
    actor: AuthenticatedUser | undefined,
    ipAddress: string,
    dto: SendChatMessage,
  ): Promise<ChatMessageResponse> {
    const scope = actor
      ? this.conversationService.scopeForUser(actor.idString)
      : this.conversationService.scopeForGuest(ipAddress);
    const conversationId =
      dto.conversationId ?? this.conversationService.newId();
    const lockOwner = await this.conversationService.acquireLock(
      scope,
      conversationId,
    );

    try {
      const history = dto.conversationId
        ? ((await this.conversationService.load(scope, conversationId)) ?? [])
        : [];
      const input: LlmMessage[] = [
        ...history.map(
          (message): LlmMessage => ({
            role: message.role,
            content: message.content,
          }),
        ),
        { role: 'user', content: dto.message },
      ];
      let confirmedTool: ChatToolName | null = null;
      let confirmedArgs: Record<string, unknown> | null = null;
      let confirmedResult: unknown;

      if (dto.confirmationToken) {
        if (!dto.conversationId) {
          throw new HttpException(
            {
              code: 'CHAT_CONFIRMATION_INVALID',
              message: 'Xác nhận không gắn với cuộc trò chuyện hợp lệ',
              details: [],
            },
            409,
          );
        }
        const confirmation = await this.conversationService.readConfirmation(
          scope,
          conversationId,
          dto.confirmationToken,
        );
        const parsed = this.toolDispatcher.parseAndAuthorize(
          actor,
          confirmation.toolName,
          confirmation.rawArguments,
        );
        await this.conversationService.consumeConfirmation(
          scope,
          conversationId,
          dto.confirmationToken,
        );
        const result = await this.toolDispatcher.dispatchConfirmed(
          actor,
          confirmation.toolName,
          confirmation.rawArguments,
        );
        confirmedTool = parsed.name;
        confirmedArgs = parsed.args;
        confirmedResult = result;
        input.push({
          role: 'developer',
          content: `KẾT QUẢ HÀNH ĐỘNG ĐÃ ĐƯỢC SERVER XÁC NHẬN:\n${JSON.stringify(result)}`,
        });
      }

      const result = await this.runToolLoop(
        actor,
        input,
        scope,
        conversationId,
      );
      const message = result.message;
      await this.saveTurn(scope, conversationId, history, dto.message, message);

      const actionTool = result.actionTool ?? confirmedTool;
      const actionArgs = result.actionArgs ?? confirmedArgs;
      const href =
        actionTool && actionArgs
          ? (CHAT_TOOLS[actionTool].buildHref?.(
              result.actionTool ? result.actionResult : confirmedResult,
              actionArgs,
            ) ?? null)
          : null;
      return {
        conversationId,
        message,
        pendingAction: result.pendingAction,
        suggestedActions: href
          ? [{ label: this.actionLabel(actionTool), href }]
          : [],
        productPreviews: result.productPreviews,
      };
    } finally {
      await this.conversationService.releaseLock(
        scope,
        conversationId,
        lockOwner,
      );
    }
  }

  async deleteConversation(
    actor: AuthenticatedUser | undefined,
    ipAddress: string,
    conversationId: string,
  ): Promise<{ deleted: true }> {
    const scope = actor
      ? this.conversationService.scopeForUser(actor.idString)
      : this.conversationService.scopeForGuest(ipAddress);
    await this.conversationService.delete(scope, conversationId);
    return { deleted: true };
  }

  private async runToolLoop(
    actor: AuthenticatedUser | undefined,
    initialInput: LlmMessage[],
    scope: string,
    conversationId: string,
  ): Promise<{
    message: string;
    actionTool: ChatToolName | null;
    actionArgs: Record<string, unknown> | null;
    actionResult: unknown;
    pendingAction: ChatMessageResponse['pendingAction'];
    productPreviews: ChatProductPreview[];
  }> {
    const maxCalls = this.envInteger('OPENAI_MAX_TOOL_CALLS', 4);
    let input = initialInput;
    let actionTool: ChatToolName | null = null;
    let actionArgs: Record<string, unknown> | null = null;
    let actionResult: unknown;
    let productPreviews: ChatProductPreview[] = [];

    for (let callCount = 0; callCount <= maxCalls; callCount += 1) {
      const response = await this.llmService.respond({
        instructions: this.promptService.build(actor),
        input,
        safetyIdentifier: this.conversationService.safetyIdentifier(scope),
      });
      if (response.functionCalls.length === 0) {
        if (!response.outputText) {
          throw new ServiceUnavailableException({
            code: 'CHAT_EMPTY_RESPONSE',
            message: 'Trợ lý chưa thể tạo câu trả lời. Vui lòng thử lại.',
            details: [],
          });
        }
        return {
          message: response.outputText,
          actionTool,
          actionArgs,
          actionResult,
          pendingAction: null,
          productPreviews,
        };
      }
      if (callCount === maxCalls) {
        throw new ServiceUnavailableException({
          code: 'CHAT_TOOL_LIMIT_REACHED',
          message: 'Yêu cầu cần quá nhiều bước. Vui lòng thu hẹp câu hỏi.',
          details: [],
        });
      }

      const call = response.functionCalls[0];
      const parsed = this.toolDispatcher.parseAndAuthorize(
        actor,
        call.name,
        call.arguments,
      );
      const tool = CHAT_TOOLS[parsed.name];
      if (tool.confirmation) {
        const confirmation = await this.conversationService.createConfirmation({
          scope,
          conversationId,
          toolName: parsed.name,
          rawArguments: call.arguments,
        });
        const summary =
          tool.confirmationSummary?.(parsed.args) ??
          'Bạn có xác nhận thực hiện hành động này không?';
        return {
          message: summary,
          actionTool: null,
          actionArgs: null,
          actionResult: null,
          pendingAction: {
            token: confirmation.token,
            summary,
            expiresAt: confirmation.expiresAt,
          },
          productPreviews,
        };
      }

      try {
        actionResult = await this.toolDispatcher.dispatch(
          actor,
          parsed.name,
          call.arguments,
        );
      } catch (error) {
        actionResult = this.safeToolError(error);
      }
      productPreviews = this.mergeProductPreviews(
        productPreviews,
        parsed.name,
        actionResult,
      );
      actionTool = parsed.name;
      actionArgs = parsed.args;
      input = [
        ...input,
        response.assistantMessage,
        this.llmService.toolOutput(call.callId, actionResult),
      ];
    }
    throw new ServiceUnavailableException();
  }

  private async saveTurn(
    scope: string,
    conversationId: string,
    history: ConversationMessage[],
    userMessage: string,
    assistantMessage: string,
  ): Promise<void> {
    await this.conversationService.save(scope, conversationId, [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage },
    ]);
  }

  private response(
    conversationId: string,
    message: string,
  ): ChatMessageResponse {
    return {
      conversationId,
      message,
      pendingAction: null,
      suggestedActions: [],
      productPreviews: [],
    };
  }

  private safeToolError(error: unknown): { success: false; message: string } {
    if (error instanceof HttpException) {
      const body = error.getResponse();
      const message =
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
          ? body.message
          : 'Không thể thực hiện yêu cầu này.';
      return { success: false, message };
    }
    return {
      success: false,
      message: 'Chức năng đang tạm gián đoạn. Vui lòng thử lại sau.',
    };
  }

  private actionLabel(tool: ChatToolName | null): string {
    if (tool?.includes('cart')) return 'Xem giỏ hàng';
    if (tool?.includes('order')) return 'Xem đơn hàng';
    if (tool?.includes('address')) return 'Xem địa chỉ';
    if (tool?.includes('voucher') || tool?.includes('shipping')) {
      return 'Tiếp tục thanh toán';
    }
    return 'Xem sản phẩm';
  }

  private mergeProductPreviews(
    current: ChatProductPreview[],
    tool: ChatToolName,
    result: unknown,
  ): ChatProductPreview[] {
    const candidates =
      tool === 'search_products'
        ? this.record(result).items
        : tool === 'get_product'
          ? [result]
          : [];
    const previews = Array.isArray(candidates)
      ? candidates
          .map((item) => this.productPreview(item))
          .filter((item): item is ChatProductPreview => item !== null)
      : [];
    return [
      ...new Map(
        [...current, ...previews].map((item) => [item.id, item]),
      ).values(),
    ].slice(0, 3);
  }

  private productPreview(value: unknown): ChatProductPreview | null {
    const product = this.record(value);
    const shop = this.record(product.shop);
    const image = this.record(product.thumbnailImage);
    if (
      typeof product.id !== 'string' ||
      typeof product.slug !== 'string' ||
      typeof product.productName !== 'string' ||
      typeof product.priceMin !== 'string' ||
      typeof product.priceMax !== 'string' ||
      typeof product.quantityAvailable !== 'number' ||
      typeof shop.shopName !== 'string'
    ) {
      return null;
    }
    const thumbnailImage =
      typeof image.imageUrl === 'string'
        ? {
            imageUrl: image.imageUrl,
            altText: typeof image.altText === 'string' ? image.altText : null,
          }
        : null;
    return {
      id: product.id,
      slug: product.slug,
      productName: product.productName,
      priceMin: product.priceMin,
      priceMax: product.priceMax,
      quantityAvailable: product.quantityAvailable,
      shopName: shop.shopName,
      thumbnailImage,
    };
  }

  private record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private envInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}

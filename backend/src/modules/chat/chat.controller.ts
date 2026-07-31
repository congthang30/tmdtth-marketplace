import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AuthenticatedRequest,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@Controller('chat')
@UseGuards(OptionalJwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('messages')
  @HttpCode(200)
  async send(
    @CurrentUser() actor: AuthenticatedUser | undefined,
    @Req() request: AuthenticatedRequest & Request,
    @Body() dto: SendChatMessageDto,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
    const scope = actor
      ? this.conversationService.scopeForUser(actor.idString)
      : this.conversationService.scopeForGuest(ipAddress);
    await this.conversationService.enforceRateLimit(
      scope,
      actor
        ? this.envInteger('CHAT_USER_RATE_LIMIT_MAX', 20)
        : this.envInteger('CHAT_GUEST_RATE_LIMIT_MAX', 10),
      this.envInteger('CHAT_RATE_LIMIT_WINDOW_SECONDS', 300),
    );
    request.res?.setHeader('Cache-Control', 'no-store');
    return this.chatService.send(actor, ipAddress, dto);
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @CurrentUser() actor: AuthenticatedUser | undefined,
    @Req() request: AuthenticatedRequest & Request,
    @Param('conversationId') conversationId: string,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
    request.res?.setHeader('Cache-Control', 'no-store');
    return this.chatService.deleteConversation(
      actor,
      ipAddress,
      conversationId,
    );
  }

  private envInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}

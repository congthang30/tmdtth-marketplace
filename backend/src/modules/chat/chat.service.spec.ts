import { ServiceUnavailableException } from '@nestjs/common';
import { AppRole } from '../auth/app-role.enum';
import { AuthenticatedUser } from '../auth/types';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  const actor: AuthenticatedUser = {
    id: 42n,
    idString: '42',
    email: 'customer@example.com',
    phoneNumber: null,
    userStatus: 'Active',
    roles: [AppRole.Customer],
    profile: null,
  };
  const conversation = {
    newId: jest.fn(() => 'conversation-id'),
    scopeForUser: jest.fn(() => 'user:42'),
    scopeForGuest: jest.fn(() => 'guest:hash'),
    safetyIdentifier: jest.fn(() => 'safe-id'),
    load: jest.fn(),
    save: jest.fn(),
    acquireLock: jest.fn().mockResolvedValue('lock-owner'),
    releaseLock: jest.fn(),
    createConfirmation: jest.fn().mockResolvedValue({
      token: 'confirmation-token',
      expiresAt: '2030-01-01T00:00:00.000Z',
    }),
    readConfirmation: jest.fn(),
    consumeConfirmation: jest.fn(),
  };
  const llm = {
    respond: jest.fn(),
    toolOutput: jest.fn((callId: string, output: unknown) => ({
      type: 'function_call_output',
      call_id: callId,
      output: JSON.stringify(output),
    })),
  };
  const prompt = { build: jest.fn(() => 'system prompt') };
  const dispatcher = {
    dispatch: jest.fn(),
    dispatchConfirmed: jest.fn(),
    parseAndAuthorize: jest.fn(),
  };
  const service = new ChatService(
    conversation as never,
    llm as never,
    prompt,
    dispatcher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    conversation.acquireLock.mockResolvedValue('lock-owner');
    conversation.newId.mockReturnValue('conversation-id');
    conversation.scopeForUser.mockReturnValue('user:42');
    conversation.safetyIdentifier.mockReturnValue('safe-id');
    dispatcher.dispatch.mockReset();
    dispatcher.dispatchConfirmed.mockReset();
    dispatcher.parseAndAuthorize.mockReset();
  });

  it('returns and stores a safe text-only answer', async () => {
    llm.respond.mockResolvedValue({
      outputText: 'Tôi có thể giúp bạn tìm sản phẩm.',
      functionCalls: [],
      assistantMessage: {
        role: 'assistant',
        content: 'Tôi có thể giúp bạn tìm sản phẩm.',
      },
    });

    await expect(
      service.send(actor, '127.0.0.1', {
        conversationId: null,
        message: 'Tìm gạo ngon',
        confirmationToken: null,
      }),
    ).resolves.toMatchObject({
      conversationId: 'conversation-id',
      message: 'Tôi có thể giúp bạn tìm sản phẩm.',
      pendingAction: null,
    });
    expect(conversation.save).toHaveBeenCalledWith(
      'user:42',
      'conversation-id',
      [
        { role: 'user', content: 'Tìm gạo ngon' },
        { role: 'assistant', content: 'Tôi có thể giúp bạn tìm sản phẩm.' },
      ],
    );
  });

  it('creates a pending action without executing a mutation', async () => {
    llm.respond.mockResolvedValue({
      outputText: '',
      functionCalls: [
        {
          callId: 'call-1',
          name: 'add_cart_item',
          arguments: '{"productVariantId":"7","quantity":1}',
        },
      ],
      assistantMessage: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'add_cart_item',
              arguments: '{"productVariantId":"7","quantity":1}',
            },
          },
        ],
      },
    });
    dispatcher.parseAndAuthorize.mockReturnValue({
      name: 'add_cart_item',
      args: { productVariantId: '7', quantity: 1 },
    });

    const result = await service.send(actor, '127.0.0.1', {
      conversationId: null,
      message: 'Thêm một sản phẩm',
      confirmationToken: null,
    });

    expect(result.pendingAction?.token).toBe('confirmation-token');
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('consumes confirmation and executes the mutation exactly once', async () => {
    conversation.readConfirmation.mockResolvedValue({
      toolName: 'add_cart_item',
      rawArguments: '{"productVariantId":"7","quantity":1}',
    });
    conversation.consumeConfirmation.mockResolvedValue({
      toolName: 'add_cart_item',
      rawArguments: '{"productVariantId":"7","quantity":1}',
    });
    dispatcher.dispatchConfirmed.mockResolvedValue({ id: '9' });
    dispatcher.parseAndAuthorize.mockReturnValue({
      name: 'add_cart_item',
      args: { productVariantId: '7', quantity: 1 },
    });
    llm.respond.mockResolvedValue({
      outputText: 'Đã thêm vào giỏ hàng.',
      functionCalls: [],
      assistantMessage: {
        role: 'assistant',
        content: 'Đã thêm vào giỏ hàng.',
      },
    });

    await service.send(actor, '127.0.0.1', {
      conversationId: 'conversation-id',
      message: 'Tôi xác nhận',
      confirmationToken: 'token',
    });

    expect(conversation.readConfirmation).toHaveBeenCalledTimes(1);
    expect(conversation.consumeConfirmation).toHaveBeenCalledTimes(1);
    expect(dispatcher.parseAndAuthorize).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatchConfirmed).toHaveBeenCalledTimes(1);
  });

  it('stops tool loops at the configured cap', async () => {
    llm.respond.mockResolvedValue({
      outputText: '',
      functionCalls: [{ callId: 'call', name: 'get_cart', arguments: '{}' }],
      assistantMessage: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call',
            type: 'function',
            function: { name: 'get_cart', arguments: '{}' },
          },
        ],
      },
    });
    dispatcher.dispatch.mockResolvedValue({ items: [] });
    dispatcher.parseAndAuthorize.mockReturnValue({
      name: 'get_cart',
      args: {},
    });

    await expect(
      service.send(actor, '127.0.0.1', {
        conversationId: null,
        message: 'Xem giỏ',
        confirmationToken: null,
      }),
    ).rejects.toMatchObject({ response: { code: 'CHAT_TOOL_LIMIT_REACHED' } });
  });

  it('always releases the conversation lock after a provider error', async () => {
    llm.respond.mockRejectedValue(new ServiceUnavailableException());

    await expect(
      service.send(actor, '127.0.0.1', {
        conversationId: null,
        message: 'Xin chào',
        confirmationToken: null,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(conversation.releaseLock).toHaveBeenCalledWith(
      'user:42',
      'conversation-id',
      'lock-owner',
    );
  });
});

import { ConflictException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
    expire: jest.fn(),
  };
  const redisService = { client: jest.fn().mockResolvedValue(redis) };
  const service = new ConversationService(
    redisService as unknown as RedisService,
  );

  beforeAll(() => {
    process.env.CHAT_HMAC_SECRET = 'test-chat-hmac-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
  });

  it('stores only the capped message history with a TTL', async () => {
    const messages = Array.from({ length: 35 }, (_, index) => ({
      role: index % 2 ? ('assistant' as const) : ('user' as const),
      content: `message-${index}`,
    }));

    await service.save('user:42', 'conversation-id', messages);

    const [key, raw, ex, ttl] = redis.set.mock.calls[0] as [
      string,
      string,
      string,
      number,
    ];
    expect(key).toContain('user:42:conversation-id');
    expect(JSON.parse(raw)).toHaveLength(30);
    expect(ex).toBe('EX');
    expect(ttl).toBeGreaterThan(0);
  });

  it('rejects a conversation id that does not belong to the current scope', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.load('user:9', 'foreign-id')).rejects.toMatchObject({
      response: { code: 'CHAT_CONVERSATION_NOT_FOUND' },
    });
  });

  it('allows only one active turn per conversation', async () => {
    redis.set.mockResolvedValue(null);

    await expect(
      service.acquireLock('user:42', 'conversation-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('releases a lock only through the owner-safe script', async () => {
    redis.eval.mockResolvedValue(1);

    await service.releaseLock('user:42', 'conversation-id', 'owner-token');

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('get'"),
      1,
      expect.any(String),
      'owner-token',
    );
  });

  it('consumes a confirmation token atomically only once', async () => {
    await service.createConfirmation({
      scope: 'user:42',
      conversationId: 'conversation-id',
      toolName: 'add_cart_item',
      rawArguments: '{"productVariantId":"7","quantity":1}',
    });
    const setCall = redis.set.mock.calls.at(-1) as unknown as
      | [string, string]
      | undefined;
    const stored = setCall?.[1] ?? '';
    redis.eval.mockResolvedValueOnce(stored).mockResolvedValueOnce(null);

    await expect(
      service.consumeConfirmation('user:42', 'conversation-id', 'token'),
    ).resolves.toMatchObject({ toolName: 'add_cart_item' });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('decoded.scope'),
      1,
      expect.any(String),
      'user:42',
      'conversation-id',
    );
    await expect(
      service.consumeConfirmation('user:42', 'conversation-id', 'token'),
    ).rejects.toMatchObject({
      response: { code: 'CHAT_CONFIRMATION_INVALID' },
    });
  });

  it('does not consume a confirmation token from another actor scope', async () => {
    redis.eval.mockResolvedValue(null);

    await expect(
      service.consumeConfirmation('user:9', 'conversation-id', 'token'),
    ).rejects.toMatchObject({
      response: { code: 'CHAT_CONFIRMATION_INVALID' },
    });

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('decoded.conversationId'),
      1,
      expect.any(String),
      'user:9',
      'conversation-id',
    );
  });

  it('deletes only a conversation key in the supplied scope', async () => {
    await service.delete('user:42', 'conversation-id');

    expect(redis.del).toHaveBeenCalledWith(
      expect.stringContaining('user:42:conversation-id'),
    );
  });
});

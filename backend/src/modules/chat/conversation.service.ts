import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomBytes, randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { ChatToolName } from './tools/tool-registry';

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type StoredConfirmation = {
  scope: string;
  conversationId: string;
  toolName: ChatToolName;
  rawArguments: string;
  argumentsHash: string;
};

type Confirmation = Omit<StoredConfirmation, 'argumentsHash'>;

const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;
const CONSUME_SCRIPT = `
local value = redis.call('get', KEYS[1])
if not value then return nil end
local decoded = cjson.decode(value)
if decoded.scope ~= ARGV[1] or decoded.conversationId ~= ARGV[2] then
  return nil
end
redis.call('del', KEYS[1])
return value`;
const RATE_LIMIT_SCRIPT = `
local count = redis.call('incr', KEYS[1])
if count == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
return count`;

@Injectable()
export class ConversationService {
  private readonly ttlSeconds = this.envInteger(
    'CHAT_CONVERSATION_TTL_SECONDS',
    86400,
  );
  private readonly confirmationTtlSeconds = this.envInteger(
    'CHAT_CONFIRMATION_TTL_SECONDS',
    300,
  );
  private readonly maxMessages = this.envInteger('CHAT_MAX_MESSAGES', 30);

  constructor(private readonly redisService: RedisService) {}

  newId(): string {
    return randomUUID();
  }

  scopeForUser(userId: string): string {
    return `user:${userId}`;
  }

  scopeForGuest(ipAddress: string): string {
    return `guest:${this.hmac(ipAddress || 'unknown')}`;
  }

  safetyIdentifier(scope: string): string {
    return this.hmac(scope).slice(0, 64);
  }

  async load(
    scope: string,
    conversationId: string,
  ): Promise<ConversationMessage[]> {
    const redis = await this.redisService.client();
    const key = this.conversationKey(scope, conversationId);
    const raw = await redis.get(key);
    if (!raw) {
      throw new NotFoundException({
        code: 'CHAT_CONVERSATION_NOT_FOUND',
        message: 'Không tìm thấy cuộc trò chuyện này',
        details: [],
      });
    }
    await redis.expire(key, this.ttlSeconds);
    try {
      return JSON.parse(raw) as ConversationMessage[];
    } catch {
      await redis.del(key);
      throw new ServiceUnavailableException({
        code: 'CHAT_CONVERSATION_CORRUPTED',
        message:
          'Không thể tiếp tục cuộc trò chuyện. Vui lòng tạo cuộc trò chuyện mới.',
        details: [],
      });
    }
  }

  async save(
    scope: string,
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void> {
    const redis = await this.redisService.client();
    const capped = messages
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 4000),
      }))
      .slice(-this.maxMessages);
    await redis.set(
      this.conversationKey(scope, conversationId),
      JSON.stringify(capped),
      'EX',
      this.ttlSeconds,
    );
  }

  async delete(scope: string, conversationId: string): Promise<void> {
    const redis = await this.redisService.client();
    await redis.del(this.conversationKey(scope, conversationId));
  }

  async acquireLock(scope: string, conversationId: string): Promise<string> {
    const redis = await this.redisService.client();
    const owner = randomUUID();
    const acquired = await redis.set(
      this.lockKey(scope, conversationId),
      owner,
      'PX',
      45000,
      'NX',
    );
    if (!acquired) {
      throw new ConflictException({
        code: 'CHAT_CONVERSATION_BUSY',
        message: 'Trợ lý đang xử lý tin nhắn trước. Vui lòng chờ một chút.',
        details: [],
      });
    }
    return owner;
  }

  async releaseLock(
    scope: string,
    conversationId: string,
    owner: string,
  ): Promise<void> {
    const redis = await this.redisService.client();
    await redis.eval(
      RELEASE_LOCK_SCRIPT,
      1,
      this.lockKey(scope, conversationId),
      owner,
    );
  }

  async createConfirmation(
    confirmation: Confirmation,
  ): Promise<{ token: string; expiresAt: string }> {
    const redis = await this.redisService.client();
    const token = randomBytes(32).toString('base64url');
    const stored: StoredConfirmation = {
      ...confirmation,
      argumentsHash: this.hmac(confirmation.rawArguments),
    };
    await redis.set(
      this.confirmationKey(token),
      JSON.stringify(stored),
      'EX',
      this.confirmationTtlSeconds,
      'NX',
    );
    return {
      token,
      expiresAt: new Date(
        Date.now() + this.confirmationTtlSeconds * 1000,
      ).toISOString(),
    };
  }

  async readConfirmation(
    scope: string,
    conversationId: string,
    token: string,
  ): Promise<Confirmation> {
    const redis = await this.redisService.client();
    const raw = await redis.get(this.confirmationKey(token));
    if (!raw) return this.invalidConfirmation();
    return this.parseConfirmation(raw, scope, conversationId);
  }

  async consumeConfirmation(
    scope: string,
    conversationId: string,
    token: string,
  ): Promise<Confirmation> {
    const redis = await this.redisService.client();
    const raw = await redis.eval(
      CONSUME_SCRIPT,
      1,
      this.confirmationKey(token),
      scope,
      conversationId,
    );
    if (typeof raw !== 'string') return this.invalidConfirmation();
    return this.parseConfirmation(raw, scope, conversationId);
  }

  async enforceRateLimit(
    scope: string,
    limit: number,
    windowSeconds: number,
  ): Promise<void> {
    const redis = await this.redisService.client();
    const window = Math.floor(Date.now() / (windowSeconds * 1000));
    const count = await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      `chat:v1:rate:${scope}:${window}`,
      windowSeconds,
    );
    if (Number(count) > limit) {
      throw new HttpException(
        {
          code: 'CHAT_RATE_LIMITED',
          message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.',
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private conversationKey(scope: string, conversationId: string): string {
    return `chat:v1:conversation:${scope}:${conversationId}`;
  }

  private lockKey(scope: string, conversationId: string): string {
    return `chat:v1:lock:${scope}:${conversationId}`;
  }

  private confirmationKey(token: string): string {
    return `chat:v1:confirm:${this.hmac(token)}`;
  }

  private parseConfirmation(
    raw: string,
    scope: string,
    conversationId: string,
  ): Confirmation {
    try {
      const confirmation = JSON.parse(raw) as StoredConfirmation;
      if (
        typeof confirmation.scope !== 'string' ||
        typeof confirmation.conversationId !== 'string' ||
        typeof confirmation.toolName !== 'string' ||
        typeof confirmation.rawArguments !== 'string' ||
        typeof confirmation.argumentsHash !== 'string' ||
        confirmation.scope !== scope ||
        confirmation.conversationId !== conversationId ||
        confirmation.argumentsHash !== this.hmac(confirmation.rawArguments)
      ) {
        return this.invalidConfirmation();
      }
      return {
        scope: confirmation.scope,
        conversationId: confirmation.conversationId,
        toolName: confirmation.toolName,
        rawArguments: confirmation.rawArguments,
      };
    } catch {
      return this.invalidConfirmation();
    }
  }

  private invalidConfirmation(): never {
    throw new ConflictException({
      code: 'CHAT_CONFIRMATION_INVALID',
      message: 'Xác nhận đã hết hạn hoặc đã được sử dụng',
      details: [],
    });
  }

  private hmac(value: string): string {
    const secret = process.env.CHAT_HMAC_SECRET;
    if (
      !secret ||
      (process.env.NODE_ENV === 'production' && secret.length < 32)
    ) {
      throw new ServiceUnavailableException({
        code: 'CHAT_NOT_CONFIGURED',
        message: 'Trợ lý chưa được cấu hình đầy đủ',
        details: [],
      });
    }
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  private envInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}

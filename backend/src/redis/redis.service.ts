import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly redis = new Redis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    },
  );

  async client(): Promise<Redis> {
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.ping();
      return this.redis;
    } catch {
      throw new ServiceUnavailableException({
        code: 'CHAT_STORE_UNAVAILABLE',
        message: 'Trợ lý đang tạm gián đoạn. Vui lòng thử lại sau.',
        details: [],
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status === 'end') return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}

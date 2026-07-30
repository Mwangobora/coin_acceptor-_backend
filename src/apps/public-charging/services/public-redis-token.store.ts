import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PublicRedisTokenStore implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('security.redisUrl'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async setJson<T extends object>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}

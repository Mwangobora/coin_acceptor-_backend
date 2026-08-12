import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PublicRedisTokenStore implements OnModuleDestroy {
  private readonly memory = new Map<string, { expiresAt: number; value: string }>();
  private readonly redis?: Redis;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('security.redisUrl');
    if (!redisUrl) return;

    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async setJson<T extends object>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.redis) {
      this.memory.set(key, {
        expiresAt: Date.now() + ttlSeconds * 1000,
        value: JSON.stringify(value),
      });
      return;
    }

    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      const entry = this.memory.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        this.memory.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }

    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) {
      this.memory.delete(key);
      return;
    }

    await this.redis.del(key);
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
    this.memory.clear();
  }
}

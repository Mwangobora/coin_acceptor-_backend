import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class DeviceReplayProtectionService implements OnModuleDestroy {
  private readonly memory = new Map<string, number>();
  private readonly redis?: Redis;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('security.redisUrl');
    if (!redisUrl) return;

    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async reserveNonce(
    credentialId: string,
    nonce: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const key = `device-auth:nonce:${credentialId}:${nonce}`;
    if (!this.redis) return this.reserveMemoryNonce(key, ttlSeconds);

    if (this.redis.status === 'wait') await this.redis.connect();
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
    this.memory.clear();
  }

  private reserveMemoryNonce(key: string, ttlSeconds: number): boolean {
    this.purgeExpiredMemoryNonces();
    if (this.memory.has(key)) return false;
    this.memory.set(key, Date.now() + ttlSeconds * 1000);
    return true;
  }

  private purgeExpiredMemoryNonces(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.memory.entries()) {
      if (expiresAt <= now) this.memory.delete(key);
    }
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class DeviceReplayProtectionService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('security.redisUrl'), {
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
    if (this.redis.status === 'wait') await this.redis.connect();
    const key = `device-auth:nonce:${credentialId}:${nonce}`;
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}

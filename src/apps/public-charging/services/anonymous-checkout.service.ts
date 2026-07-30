import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_CHECKOUT_TTL_SECONDS } from '../constants/public-charging.constants';
import type { CheckoutTokenRecord } from '../types/public-token.type';
import { PublicRedisTokenStore } from './public-redis-token.store';
import { PublicTokenCryptoService } from './public-token-crypto.service';

@Injectable()
export class AnonymousCheckoutService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly crypto: PublicTokenCryptoService,
    private readonly store: PublicRedisTokenStore,
    config: ConfigService,
  ) {
    this.ttlSeconds = Number(
      config.get('security.publicCheckoutTtlSeconds') ??
        DEFAULT_CHECKOUT_TTL_SECONDS,
    );
  }

  async issue(input: { stationId: string; deviceId: string }) {
    const checkoutToken = this.crypto.generate();
    const checkoutHash = this.crypto.hash(checkoutToken);
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    await this.store.setJson<CheckoutTokenRecord>(
      this.key(checkoutHash),
      {
        checkoutHash,
        stationId: input.stationId,
        deviceId: input.deviceId,
        expiresAt: expiresAt.toISOString(),
      },
      this.ttlSeconds,
    );
    return { checkoutToken, checkoutHash, expiresAt };
  }

  async require(checkoutToken: string): Promise<CheckoutTokenRecord> {
    const checkoutHash = this.crypto.hash(checkoutToken);
    const record = await this.store.getJson<CheckoutTokenRecord>(
      this.key(checkoutHash),
    );
    if (!record || record.expiresAt <= new Date().toISOString()) {
      throw new UnauthorizedException('Invalid public charging token.');
    }
    return record;
  }

  private key(hash: string): string {
    return `public:checkout:${hash}`;
  }
}

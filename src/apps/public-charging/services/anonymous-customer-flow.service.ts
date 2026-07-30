import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_FLOW_TTL_SECONDS } from '../constants/public-charging.constants';
import type { CustomerFlowRecord } from '../types/public-token.type';
import { PublicRedisTokenStore } from './public-redis-token.store';
import { PublicTokenCryptoService } from './public-token-crypto.service';

@Injectable()
export class AnonymousCustomerFlowService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly crypto: PublicTokenCryptoService,
    private readonly store: PublicRedisTokenStore,
    config: ConfigService,
  ) {
    this.ttlSeconds = Number(
      config.get('security.publicFlowTtlSeconds') ?? DEFAULT_FLOW_TTL_SECONDS,
    );
  }

  async issue(input: Omit<CustomerFlowRecord, 'flowHash' | 'expiresAt'>) {
    const customerFlowToken = this.crypto.generate();
    const flowHash = this.crypto.hash(customerFlowToken);
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const record: CustomerFlowRecord = {
      ...input,
      flowHash,
      expiresAt: expiresAt.toISOString(),
    };
    await this.store.setJson(this.key(flowHash), record, this.ttlSeconds);
    await this.store.setJson(
      this.paymentKey(input.paymentReference),
      {
        flowHash,
      },
      this.ttlSeconds,
    );
    return { customerFlowToken, record };
  }

  async require(token: string): Promise<CustomerFlowRecord> {
    const hash = this.crypto.hash(token);
    const record = await this.store.getJson<CustomerFlowRecord>(this.key(hash));
    if (
      !record ||
      record.revokedAt ||
      record.expiresAt <= new Date().toISOString()
    ) {
      throw new UnauthorizedException('Invalid public charging token.');
    }
    return record;
  }

  async bindSession(paymentReference: string, sessionReference: string) {
    const lookup = await this.store.getJson<{ flowHash: string }>(
      this.paymentKey(paymentReference),
    );
    if (!lookup) return;
    const record = await this.store.getJson<CustomerFlowRecord>(
      this.key(lookup.flowHash),
    );
    if (!record) return;
    await this.store.setJson(
      this.key(lookup.flowHash),
      { ...record, sessionReference },
      secondsUntil(record.expiresAt),
    );
  }

  private key(hash: string): string {
    return `public:flow:${hash}`;
  }

  private paymentKey(reference: string): string {
    return `public:payment-flow:${reference}`;
  }
}

function secondsUntil(iso: string): number {
  return Math.max(1, Math.floor((Date.parse(iso) - Date.now()) / 1000));
}

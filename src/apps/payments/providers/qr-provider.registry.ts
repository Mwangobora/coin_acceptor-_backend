import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { QrPaymentProvider } from '../types/payment-provider.type';
import { MockQrPaymentProvider } from './mock-qr-payment.provider';

@Injectable()
export class QrProviderRegistry {
  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockQrPaymentProvider,
  ) {}

  get(provider = this.config.getOrThrow<string>('security.qrPaymentProvider')) {
    if (provider === 'mock') return this.mock;
    throw new BadRequestException('QR payment provider is not configured.');
  }

  byName(provider: string): QrPaymentProvider {
    return this.get(provider);
  }
}

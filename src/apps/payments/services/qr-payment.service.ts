import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';
import { QrProviderRegistry } from '../providers/qr-provider.registry';
import { sanitizeJson } from './payment-sanitizer.service';

@Injectable()
export class QrPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: QrProviderRegistry,
    private readonly config: ConfigService,
  ) {}

  async createTransaction(payment: {
    id: string;
    payment_reference: string;
    expected_amount_minor: bigint;
    currency: string;
  }) {
    const provider = this.providers.get();
    const expiresAt = new Date(
      Date.now() +
        this.config.getOrThrow<number>('security.qrPaymentExpirySeconds') *
          1000,
    );
    const merchantReference = `QR-${payment.payment_reference}-${randomUUID()}`;
    const result = await provider.createTransaction({
      paymentReference: payment.payment_reference,
      merchantReference,
      amountMinor: payment.expected_amount_minor,
      currency: payment.currency,
      expiresAt,
    });
    return this.prisma.qr_payment_transactions.create({
      data: {
        payment_id: payment.id,
        provider: result.provider,
        merchant_reference: result.merchantReference,
        provider_transaction_id: result.providerTransactionId,
        qr_reference: result.qrReference ?? result.qrPayload,
        provider_status: result.providerStatus,
        amount_minor: payment.expected_amount_minor,
        currency: payment.currency,
        qr_expires_at: result.expiresAt,
        raw_response: sanitizeJson(result.rawResponse),
      },
    });
  }
}

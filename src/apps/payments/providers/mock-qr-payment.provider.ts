import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  QrCreateInput,
  QrCreateResult,
  QrPaymentProvider,
  QrRefundResult,
  QrWebhookEvent,
} from '../types/payment-provider.type';
import { sanitizeJson } from '../services/payment-sanitizer.service';

@Injectable()
export class MockQrPaymentProvider implements QrPaymentProvider {
  readonly name = 'mock';
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('security.qrMockWebhookSecret');
  }

  createTransaction(input: QrCreateInput): Promise<QrCreateResult> {
    return Promise.resolve({
      provider: this.name,
      merchantReference: input.merchantReference,
      providerTransactionId: `mock-${input.merchantReference}`,
      qrReference: `QR-${input.paymentReference}`,
      qrPayload: `mock://pay/${input.merchantReference}`,
      providerStatus: 'pending',
      expiresAt: input.expiresAt,
      rawResponse: { provider: this.name, mode: 'development' },
    });
  }

  verifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<boolean> {
    const signature = header(input.headers, 'x-mock-signature');
    if (!signature) return Promise.resolve(false);
    const expected = createHmac('sha256', this.secret)
      .update(input.rawBody)
      .digest('hex');
    return Promise.resolve(safeEqual(signature, expected));
  }

  parseWebhook(rawBody: Buffer): Promise<QrWebhookEvent> {
    return Promise.resolve().then(() => {
      const parsed = JSON.parse(rawBody.toString('utf8')) as Record<
        string,
        unknown
      >;
      const status = stringValue(parsed.status);
      if (!['confirmed', 'failed', 'expired'].includes(status)) {
        throw new BadRequestException('Unsupported QR webhook status.');
      }
      const amountMinor = Number(parsed.amountMinor);
      if (!Number.isInteger(amountMinor) || amountMinor < 1) {
        throw new BadRequestException('Invalid QR webhook amount.');
      }
      return {
        merchantReference: stringValue(parsed.merchantReference),
        providerTransactionId: optionalString(parsed.providerTransactionId),
        status: status as QrWebhookEvent['status'],
        amountMinor: BigInt(amountMinor),
        currency: stringValue(parsed.currency),
        rawResponse: sanitizeJson(parsed),
        failureCode: optionalString(parsed.failureCode),
        failureReason: optionalString(parsed.failureReason),
      };
    });
  }

  queryTransaction(merchantReference: string): Promise<QrWebhookEvent | null> {
    void merchantReference;
    return Promise.resolve(null);
  }

  refundTransaction(input: {
    merchantReference: string;
    providerTransactionId?: string | null;
    amountMinor: bigint;
    currency: string;
    idempotencyKey: string;
  }): Promise<QrRefundResult> {
    return Promise.resolve({
      providerStatus: 'refunded',
      providerTransactionId: input.providerTransactionId ?? undefined,
      rawResponse: {
        provider: this.name,
        merchantReference: input.merchantReference,
        refunded: true,
      },
    });
  }
}

function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

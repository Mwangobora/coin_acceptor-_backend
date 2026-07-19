import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { MockQrPaymentProvider } from './mock-qr-payment.provider';

describe('MockQrPaymentProvider', () => {
  const secret = 'mock-secret';
  const provider = new MockQrPaymentProvider({
    getOrThrow: jest.fn().mockReturnValue(secret),
  } as never);

  it('creates, verifies, parses, queries, and refunds mock transactions', async () => {
    const created = await provider.createTransaction({
      paymentReference: 'PAY-1',
      merchantReference: 'MERCHANT-1',
      amountMinor: 500n,
      currency: 'TZS',
    });
    expect(created.providerStatus).toBe('pending');
    const raw = Buffer.from(
      JSON.stringify({
        merchantReference: 'MERCHANT-1',
        status: 'confirmed',
        amountMinor: 500,
        currency: 'TZS',
        token: 'hidden',
      }),
    );
    const signature = createHmac('sha256', secret).update(raw).digest('hex');
    await expect(
      provider.verifyWebhook({
        rawBody: raw,
        headers: { 'x-mock-signature': signature },
      }),
    ).resolves.toBe(true);
    await expect(
      provider.verifyWebhook({ rawBody: raw, headers: {} }),
    ).resolves.toBe(false);
    await expect(provider.parseWebhook(raw)).resolves.toMatchObject({
      status: 'confirmed',
      rawResponse: { merchantReference: 'MERCHANT-1', status: 'confirmed' },
    });
    await expect(provider.queryTransaction('MERCHANT-1')).resolves.toBeNull();
    await expect(
      provider.refundTransaction({
        merchantReference: 'MERCHANT-1',
        amountMinor: 500n,
        currency: 'TZS',
        idempotencyKey: 'refund-1',
      }),
    ).resolves.toMatchObject({ providerStatus: 'refunded' });
  });

  it('rejects invalid webhook bodies', async () => {
    await expect(
      provider.parseWebhook(Buffer.from(JSON.stringify({ status: 'weird' }))),
    ).rejects.toThrow(BadRequestException);
    await expect(
      provider.parseWebhook(
        Buffer.from(JSON.stringify({ status: 'confirmed', amountMinor: 0 })),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

import type { payments } from '@prisma/client';

import type { QrWebhookEvent } from '../types/payment-provider.type';
import { conflictAudit, paymentData } from './payment-webhook-state';

describe('payment webhook state helpers', () => {
  const payment = {
    id: 'payment-1',
    station_id: 'station-1',
    expected_amount_minor: 500n,
  } as payments;

  it('maps confirmed events to received money and confirmation time', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(paymentData(payment, event('confirmed'), now)).toMatchObject({
      status: 'confirmed',
      received_amount_minor: 500n,
      confirmed_at: now,
    });
  });

  it('maps failed and expired events without leaking sensitive response fields', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(paymentData(payment, event('failed'), now)).toMatchObject({
      status: 'failed',
      failed_at: now,
    });
    expect(paymentData(payment, event('expired'), now)).toMatchObject({
      status: 'expired',
      expired_at: now,
    });
    expect(
      conflictAudit(payment, 'qr-1', 'conflict', {
        safe: true,
        token: 'never',
      }).metadata,
    ).toEqual({ safe: true });
  });
});

function event(status: QrWebhookEvent['status']): QrWebhookEvent {
  return {
    merchantReference: 'merchant-1',
    status,
    amountMinor: 500n,
    currency: 'TZS',
    rawResponse: {},
  };
}

import { ConflictException, NotFoundException } from '@nestjs/common';

import { PaymentCancellationService } from './payment-cancellation.service';
import { PaymentStatusPolicy } from './payment-status.policy';

type TestTransaction = {
  qr_payment_transactions: { update: jest.Mock };
  payments: { update: jest.Mock };
  audit_logs: { create: jest.Mock };
};

type TransactionCallback = (client: TestTransaction) => unknown;

describe('PaymentCancellationService', () => {
  const prisma = {
    payments: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx: TestTransaction = {
    qr_payment_transactions: { update: jest.fn() },
    payments: { update: jest.fn() },
    audit_logs: { create: jest.fn() },
  };
  const audit = { record: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: TransactionCallback) =>
      callback(tx),
    );
  });

  it('rejects missing and terminal payments', async () => {
    prisma.payments.findFirst.mockResolvedValueOnce(null);
    await expect(cancel()).rejects.toThrow(NotFoundException);
    prisma.payments.findFirst.mockResolvedValueOnce(
      payment({ status: 'confirmed' }),
    );
    await expect(cancel()).rejects.toThrow(ConflictException);
  });

  it('returns already cancelled payments idempotently', async () => {
    prisma.payments.findFirst.mockResolvedValueOnce(
      payment({ status: 'cancelled' }),
    );
    await expect(cancel()).resolves.toMatchObject({ status: 'cancelled' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cancels pending QR payments and records audit logs', async () => {
    prisma.payments.findFirst.mockResolvedValueOnce(
      payment({ status: 'pending', qr: true }),
    );
    tx.payments.update.mockResolvedValueOnce(
      payment({ status: 'cancelled', qr: true }),
    );
    await expect(cancel()).resolves.toMatchObject({ status: 'cancelled' });
    expect(tx.qr_payment_transactions.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'payments.cancelled' }),
      tx,
    );
  });

  function cancel() {
    return new PaymentCancellationService(
      prisma as never,
      audit as never,
      new PaymentStatusPolicy(),
    ).cancel({
      paymentReference: 'PAY-1',
      auth: {
        deviceId: 'device-1',
        stationId: 'station-1',
        credentialId: 'cred-1',
        keyId: 'key-1',
        credentialType: 'api_key',
      },
      reason: 'test',
    });
  }
});

function payment(input: { status: string; qr?: boolean }) {
  return {
    id: 'payment-1',
    payment_reference: 'PAY-1',
    station_id: 'station-1',
    device_id: 'device-1',
    charging_package_id: 'package-1',
    payment_method: input.qr ? 'qr' : 'coin',
    status: input.status,
    expected_amount_minor: 500n,
    received_amount_minor: 0n,
    currency: 'TZ',
    package_name_snapshot: 'Package',
    package_duration_seconds_snapshot: 900,
    initiated_at: new Date(),
    confirmed_at: null,
    failed_at: null,
    expired_at: null,
    cancelled_at: null,
    refunded_at: null,
    failure_code: null,
    failure_reason: null,
    qr_payment_transactions: input.qr ? qrTransaction() : null,
  };
}

function qrTransaction() {
  return {
    id: 'qr-1',
    payment_id: 'payment-1',
    provider: 'mock',
    merchant_reference: 'merchant-1',
    provider_transaction_id: null,
    qr_reference: 'qr-ref',
    provider_status: 'pending',
    amount_minor: 500n,
    currency: 'TZS',
    requested_at: new Date(),
    qr_expires_at: null,
    callback_received_at: null,
    confirmed_at: null,
    failed_at: null,
    failure_code: null,
    failure_reason: null,
    raw_response: {},
    created_at: new Date(),
    updated_at: new Date(),
  };
}

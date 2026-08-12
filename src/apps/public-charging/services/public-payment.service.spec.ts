import { NotFoundException } from '@nestjs/common';

import { PublicPaymentService } from './public-payment.service';

describe('PublicPaymentService', () => {
  it('returns safe public payment status and failure messages', async () => {
    const service = serviceWith(paymentRow('failed', 'provider stack'));

    await expect(service.status('PAY-1', 'flow')).resolves.toMatchObject({
      paymentReference: 'PAY-1',
      status: 'failed',
      amountMinor: '500',
      failureMessage: 'Payment could not be completed.',
      canClaimLockerPin: false,
    });
  });

  it('rejects mismatched flow tokens and missing payments generically', async () => {
    await expect(
      serviceWith(paymentRow('pending', null), 'OTHER').status('PAY-1', 'flow'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      serviceWith(null).status('PAY-1', 'flow'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ensures session creation for confirmed public payments', async () => {
    const sessions = {
      ensureForPaymentReference: jest.fn().mockResolvedValue({
        session_reference: 'SESSION-1',
      }),
    };
    const service = serviceWith(
      paymentRow('confirmed', null),
      'PAY-1',
      sessions,
    );

    await expect(service.status('PAY-1', 'flow')).resolves.toMatchObject({
      sessionReference: 'SESSION-1',
      canClaimLockerPin: true,
    });
    expect(sessions.ensureForPaymentReference).toHaveBeenCalledWith('PAY-1');
  });
});

function serviceWith(
  payment: unknown,
  flowPaymentReference = 'PAY-1',
  sessions = { ensureForPaymentReference: jest.fn() },
) {
  const prisma = {
    payments: { findUnique: jest.fn().mockResolvedValue(payment) },
  };
  const flows = {
    require: jest.fn().mockResolvedValue({
      paymentReference: flowPaymentReference,
      paymentId: 'payment-id',
    }),
  };
  return new PublicPaymentService(
    prisma as never,
    {} as never,
    flows as never,
    {} as never,
    sessions as never,
    { record: jest.fn() } as never,
  );
}

function paymentRow(status: string, failureReason: string | null) {
  return {
    id: 'payment-id',
    payment_reference: 'PAY-1',
    status,
    expected_amount_minor: 500n,
    currency: 'TZS',
    failure_reason: failureReason,
    qr_payment_transactions: { qr_expires_at: new Date() },
  };
}

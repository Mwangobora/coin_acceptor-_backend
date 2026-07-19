import {
  Prisma,
  type payments,
  type qr_payment_transactions,
} from '@prisma/client';

import type { QrWebhookEvent } from '../types/payment-provider.type';
import { sanitizeJson } from './payment-sanitizer.service';
import { PaymentStatusPolicy } from './payment-status.policy';

export function paymentData(
  payment: payments,
  event: QrWebhookEvent,
  now: Date,
) {
  if (event.status === 'confirmed') {
    return {
      status: 'confirmed',
      received_amount_minor: payment.expected_amount_minor,
      confirmed_at: now,
    };
  }
  return {
    status: event.status,
    failed_at: event.status === 'failed' ? now : undefined,
    expired_at: event.status === 'expired' ? now : undefined,
    failure_code: event.failureCode,
    failure_reason: event.failureReason,
  };
}

export function conflictAudit(
  payment: payments,
  qrId: string,
  reason: string,
  rawResponse?: Record<string, unknown>,
) {
  return {
    action: 'payments.conflicting_callback',
    entityType: 'qr_payment_transactions',
    entityId: qrId,
    stationId: payment.station_id,
    reason,
    metadata: rawResponse ? sanitizeJson(rawResponse) : undefined,
  };
}

export async function lockedPayment(
  tx: Prisma.TransactionClient,
  paymentId: string,
) {
  const rows = await tx.$queryRaw<payments[]>`
    SELECT * FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function updatePaymentStatus(
  tx: Prisma.TransactionClient,
  payment: payments,
  qr: qr_payment_transactions,
  event: QrWebhookEvent,
  policy: PaymentStatusPolicy,
) {
  policy.assertTransition(payment.status, event.status);
  const now = new Date();
  await tx.qr_payment_transactions.update({
    where: { id: qr.id },
    data: {
      provider_status: event.status,
      provider_transaction_id: event.providerTransactionId,
      callback_received_at: now,
      confirmed_at: event.status === 'confirmed' ? now : undefined,
      failed_at: event.status === 'failed' ? now : undefined,
      failure_code: event.failureCode,
      failure_reason: event.failureReason,
      raw_response: sanitizeJson(event.rawResponse),
    },
  });
  return tx.payments.update({
    where: { id: payment.id },
    data: paymentData(payment, event, now),
    include: { qr_payment_transactions: true },
  });
}

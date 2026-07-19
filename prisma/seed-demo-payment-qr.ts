import { ids } from './seed-demo-ids';

const PACKAGE_AMOUNTS = [500, 1000, 1800];

export function qrTransactions() {
  return [
    qrTransaction(1, 'confirmed', 'DEMO-PROVIDER-TXN-001'),
    qrTransaction(3, 'pending', null),
    qrTransaction(4, 'failed', 'DEMO-PROVIDER-TXN-004'),
    qrTransaction(5, 'refunded', 'DEMO-PROVIDER-TXN-005'),
  ];
}

function qrTransaction(
  index: number,
  status: string,
  providerTransactionId: string | null,
) {
  const confirmed = ['confirmed', 'refunded'].includes(status);
  return {
    id: `00000000-0000-4000-8000-00000000052${index}`,
    payment_id: ids.payments[index],
    provider: 'demo-mobile-money',
    merchant_reference: `DEMO-MERCHANT-00${index + 1}`,
    provider_transaction_id: providerTransactionId,
    qr_reference: `DEMO-QR-00${index + 1}`,
    provider_status: status,
    amount_minor: PACKAGE_AMOUNTS[index % PACKAGE_AMOUNTS.length],
    currency: 'TZS',
    requested_at: new Date(`2026-07-19T09:1${index}:00.000Z`),
    qr_expires_at: new Date(`2026-07-19T09:4${index}:00.000Z`),
    callback_received_at: confirmed
      ? new Date(`2026-07-19T09:1${index}:10.000Z`)
      : null,
    confirmed_at: confirmed
      ? new Date(`2026-07-19T09:1${index}:10.000Z`)
      : null,
    failed_at:
      status === 'failed' ? new Date('2026-07-19T09:44:00.000Z') : null,
    failure_code: status === 'failed' ? 'provider_failed' : null,
    failure_reason: status === 'failed' ? 'Demo provider failure.' : null,
    raw_response: { seed: 'demo', status },
  };
}

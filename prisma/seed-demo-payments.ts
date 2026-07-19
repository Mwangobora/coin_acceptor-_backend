import type { PrismaClient } from '@prisma/client';

import { ids } from './seed-demo-ids';
import { insertRow } from './seed-utils';

export async function seedDemoPayments(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const row of payments())
    count += await insertRow(prisma, 'payments', row);
  count += await insertRow(prisma, 'coin_insertions', coinInsertion());
  count += await insertRow(prisma, 'qr_payment_transactions', qrConfirmed());
  count += await insertRow(prisma, 'qr_payment_transactions', qrPending());
  return count;
}

function payment(
  index: number,
  method: 'coin' | 'qr',
  status: string,
  amount: number,
) {
  const confirmed = status === 'confirmed';
  return {
    id: ids.payments[index],
    payment_reference: `DEMO-PAYMENT-00${index + 1}`,
    station_id: ids.station,
    device_id: ids.device,
    charging_package_id: ids.packages[index],
    payment_method: method,
    source: 'device',
    status,
    expected_amount_minor: amount,
    received_amount_minor: confirmed ? amount : 0,
    currency: 'TZS',
    package_name_snapshot: 'seed snapshot',
    package_duration_seconds_snapshot: 1,
    idempotency_key: `demo-payment-${index + 1}`,
    initiated_at: new Date(`2026-07-19T09:1${index}:00.000Z`),
    confirmed_at: confirmed
      ? new Date(`2026-07-19T09:1${index}:10.000Z`)
      : null,
    metadata: { seed: 'demo' },
  };
}

function payments() {
  return [
    payment(0, 'coin', 'confirmed', 500),
    payment(1, 'qr', 'confirmed', 1000),
    payment(2, 'qr', 'pending', 1800),
  ];
}

function coinInsertion() {
  return {
    id: '00000000-0000-4000-8000-000000000511',
    payment_id: ids.payments[0],
    device_id: ids.device,
    device_event_id: ids.events[2],
    denomination_minor: 500,
    credited_amount_minor: 500,
    currency: 'TZS',
    pulse_count: 1,
    accepted: true,
    inserted_at: new Date('2026-07-19T09:10:05.000Z'),
    metadata: { seed: 'demo' },
  };
}

function qrConfirmed() {
  return qrTransaction(1, 'confirmed', 'DEMO-PROVIDER-TXN-001');
}

function qrPending() {
  return qrTransaction(2, 'pending', null);
}

function qrTransaction(
  index: number,
  status: 'confirmed' | 'pending',
  providerTransactionId: string | null,
) {
  const confirmed = status === 'confirmed';
  return {
    id: `00000000-0000-4000-8000-00000000052${index}`,
    payment_id: ids.payments[index],
    provider: 'demo-mobile-money',
    merchant_reference: `DEMO-MERCHANT-00${index + 1}`,
    provider_transaction_id: providerTransactionId,
    qr_reference: `DEMO-QR-00${index + 1}`,
    provider_status: status,
    amount_minor: index === 1 ? 1000 : 1800,
    currency: 'TZS',
    requested_at: new Date(`2026-07-19T09:1${index}:00.000Z`),
    qr_expires_at: new Date(`2026-07-19T09:4${index}:00.000Z`),
    callback_received_at: confirmed
      ? new Date('2026-07-19T09:11:10.000Z')
      : null,
    confirmed_at: confirmed ? new Date('2026-07-19T09:11:10.000Z') : null,
    raw_response: { seed: 'demo', status },
  };
}

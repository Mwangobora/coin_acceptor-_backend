import type { PrismaClient } from '@prisma/client';

import { ids } from './seed-demo-ids';
import { qrTransactions } from './seed-demo-payment-qr';
import { insertRow } from './seed-utils';

const PACKAGE_AMOUNTS = [500, 1000, 1800];

export async function seedDemoPayments(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const row of payments())
    count += await insertRow(prisma, 'payments', row);
  for (const row of coinInsertions())
    count += await insertRow(prisma, 'coin_insertions', row, '');
  for (const row of qrTransactions())
    count += await insertRow(prisma, 'qr_payment_transactions', row);
  return count;
}

function payment(index: number, method: 'coin' | 'qr', status: string) {
  const amount = PACKAGE_AMOUNTS[index % PACKAGE_AMOUNTS.length];
  return {
    id: ids.payments[index],
    payment_reference: `DEMO-PAYMENT-00${index + 1}`,
    station_id: ids.station,
    device_id: ids.device,
    charging_package_id: ids.packages[index % ids.packages.length],
    payment_method: method,
    source: 'device',
    status,
    expected_amount_minor: amount,
    received_amount_minor: ['confirmed', 'refunded'].includes(status)
      ? amount
      : 0,
    currency: 'TZS',
    package_name_snapshot: 'seed snapshot',
    package_duration_seconds_snapshot: 1,
    idempotency_key: `demo-payment-${index + 1}`,
    initiated_at: new Date(`2026-07-19T09:1${index}:00.000Z`),
    confirmed_at: ['confirmed', 'refunded'].includes(status)
      ? new Date(`2026-07-19T09:1${index}:10.000Z`)
      : null,
    failed_at:
      status === 'failed' ? new Date('2026-07-19T09:44:00.000Z') : null,
    refunded_at:
      status === 'refunded' ? new Date('2026-07-19T09:55:00.000Z') : null,
    failure_code: status === 'failed' ? 'provider_failed' : null,
    failure_reason: status === 'failed' ? 'Demo provider failure.' : null,
    metadata: { seed: 'demo' },
  };
}

function payments() {
  return [
    payment(0, 'coin', 'confirmed'),
    payment(1, 'qr', 'confirmed'),
    payment(2, 'coin', 'pending'),
    payment(3, 'qr', 'pending'),
    payment(4, 'qr', 'failed'),
    payment(5, 'qr', 'refunded'),
  ];
}

function coinInsertions() {
  return [
    coinInsertion(0, 0, 1, 200, 200, true),
    coinInsertion(1, 0, 2, 300, 300, true),
    coinInsertion(2, 0, 7, 1, 0, false),
  ];
}

function coinInsertion(
  index: number,
  paymentIndex: number,
  pulseCount: number,
  denomination: number,
  credited: number,
  accepted: boolean,
) {
  return {
    id: `00000000-0000-4000-8000-00000000051${index}`,
    payment_id: ids.payments[paymentIndex],
    device_id: ids.device,
    device_event_id: ids.events[index === 0 ? 2 : index + 4],
    denomination_minor: denomination,
    credited_amount_minor: credited,
    currency: 'TZS',
    pulse_count: pulseCount,
    accepted,
    reject_reason: accepted ? null : 'unsupported_pulse_count',
    inserted_at: new Date(`2026-07-19T09:10:0${index + 1}.000Z`),
    metadata: { seed: 'demo' },
  };
}

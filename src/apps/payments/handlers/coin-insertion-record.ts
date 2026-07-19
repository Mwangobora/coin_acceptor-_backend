import { Prisma, type payments } from '@prisma/client';

import type { DeviceEventContext } from '../../device-ingestion/types/device-event-handler.type';
import { sanitizeJson } from '../services/payment-sanitizer.service';
import type { CoinPayload } from './coin-insertion-payload';

export async function lockedCoinPayment(
  tx: Prisma.TransactionClient,
  reference: string,
) {
  const rows = await tx.$queryRaw<payments[]>`
    SELECT * FROM payments WHERE payment_reference = ${reference} FOR UPDATE
  `;
  return rows[0] ?? null;
}

export function insertCoin(
  tx: Prisma.TransactionClient,
  context: DeviceEventContext,
  payment: payments,
  payload: CoinPayload,
  denomination: bigint,
  credited: bigint,
  accepted: boolean,
) {
  return tx.coin_insertions.create({
    data: {
      payment_id: payment.id,
      device_id: context.event.device_id,
      device_event_id: context.event.id,
      denomination_minor: denomination,
      credited_amount_minor: credited,
      currency: payment.currency,
      pulse_count: payload.pulseCount,
      accepted,
      reject_reason: accepted ? undefined : 'unsupported_pulse_count',
      inserted_at: payload.insertedAt ?? context.event.occurred_at,
      metadata: sanitizeJson(payload.metadata ?? {}),
    },
  });
}

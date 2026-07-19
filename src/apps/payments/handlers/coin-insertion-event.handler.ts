import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type payments } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type {
  DeviceEventContext,
  DeviceEventHandler,
} from '../../device-ingestion/types/device-event-handler.type';
import { PrismaService } from '../../../database/prisma.service';
import { CoinPulseMappingService } from '../services/coin-pulse-mapping.service';
import { PaymentStatusPolicy } from '../services/payment-status.policy';
import { insertCoin, lockedCoinPayment } from './coin-insertion-record';
import { CoinPayload, parseCoinPayload } from './coin-insertion-payload';

@Injectable()
export class CoinInsertionEventHandler implements DeviceEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mappings: CoinPulseMappingService,
    private readonly policy: PaymentStatusPolicy,
    private readonly audit: AuditLogsService,
  ) {}

  canHandle(category: string, eventType: string): boolean {
    return category === 'payment' && eventType === 'payment.coin_inserted';
  }

  async handle(context: DeviceEventContext): Promise<void> {
    const payload = parseCoinPayload(context.payload);
    const amount = await this.mappings.denominationFor({
      stationId: context.event.station_id,
      deviceId: context.event.device_id,
      pulseCount: payload.pulseCount,
    });
    await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.coin_insertions.findUnique({
        where: { device_event_id: context.event.id },
      });
      if (duplicate) return;
      const payment = await lockedCoinPayment(tx, payload.paymentReference);
      if (!payment || payment.device_id !== context.event.device_id) {
        throw new BadRequestException('Payment not found.');
      }
      if (payment.payment_method !== 'coin') {
        throw new BadRequestException('Payment does not accept coins.');
      }
      if (this.policy.isTerminal(payment.status)) {
        throw new BadRequestException('Payment is already terminal.');
      }
      if (!amount) return this.reject(tx, context, payment, payload);
      await this.accept(tx, context, payment, payload, amount);
    });
  }

  private async accept(
    tx: Prisma.TransactionClient,
    context: DeviceEventContext,
    payment: payments,
    payload: CoinPayload,
    amount: bigint,
  ) {
    await insertCoin(tx, context, payment, payload, amount, amount, true);
    const received = payment.received_amount_minor + amount;
    const status =
      received >= payment.expected_amount_minor ? 'confirmed' : 'processing';
    this.policy.assertTransition(payment.status, status);
    await tx.payments.update({
      where: { id: payment.id },
      data: {
        status,
        received_amount_minor: received,
        confirmed_at: status === 'confirmed' ? new Date() : undefined,
      },
    });
  }

  private async reject(
    tx: Prisma.TransactionClient,
    context: DeviceEventContext,
    payment: payments,
    payload: CoinPayload,
  ) {
    await insertCoin(tx, context, payment, payload, 1n, 0n, false);
    await this.audit.record(
      {
        action: 'payments.coin_event_rejected',
        entityType: 'payments',
        entityId: payment.id,
        stationId: payment.station_id,
        reason: 'Unsupported coin pulse count.',
      },
      tx,
    );
  }
}

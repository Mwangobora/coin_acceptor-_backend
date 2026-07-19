import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';
import { mapPayment } from '../mappers/payment.mapper';
import { PaymentStatusPolicy } from './payment-status.policy';
import { sanitizeJson } from './payment-sanitizer.service';

@Injectable()
export class PaymentCancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly policy: PaymentStatusPolicy,
  ) {}

  async cancel(input: {
    paymentReference: string;
    auth: AuthenticatedDevice;
    reason?: string;
  }) {
    const payment = await this.prisma.payments.findFirst({
      where: {
        payment_reference: input.paymentReference,
        device_id: input.auth.deviceId,
      },
      include: { qr_payment_transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status === 'cancelled') {
      return mapPayment(payment, payment.qr_payment_transactions);
    }
    if (this.policy.isTerminal(payment.status)) {
      throw new ConflictException('Payment is already terminal.');
    }
    this.policy.assertTransition(payment.status, 'cancelled');
    const cancelled = await this.prisma.$transaction(async (tx) => {
      if (payment.qr_payment_transactions) {
        await tx.qr_payment_transactions.update({
          where: { payment_id: payment.id },
          data: {
            provider_status: 'cancelled',
            raw_response: sanitizeJson({ cancelledBy: 'device' }),
          },
        });
      }
      const updated = await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          failure_reason: input.reason,
        },
        include: { qr_payment_transactions: true },
      });
      await this.audit.record(
        {
          action: 'payments.cancelled',
          entityType: 'payments',
          entityId: payment.id,
          stationId: payment.station_id,
          reason: input.reason,
        },
        tx,
      );
      return updated;
    });
    return mapPayment(cancelled, cancelled.qr_payment_transactions);
  }
}

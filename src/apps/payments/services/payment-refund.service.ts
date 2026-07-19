import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { RefundPaymentDto } from '../dto/refund-payment.dto';
import { mapPayment } from '../mappers/payment.mapper';
import { QrProviderRegistry } from '../providers/qr-provider.registry';
import { sanitizeJson } from './payment-sanitizer.service';
import { PaymentStatusPolicy } from './payment-status.policy';

@Injectable()
export class PaymentRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: QrProviderRegistry,
    private readonly scope: StationScopeService,
    private readonly audit: AuditLogsService,
    private readonly policy: PaymentStatusPolicy,
  ) {}

  async refund(id: string, dto: RefundPaymentDto, actor: AuthenticatedUser) {
    const payment = await this.prisma.payments.findUnique({
      where: { id },
      include: { qr_payment_transactions: true },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    await this.scope.requireStation(
      actor.id,
      'payments.refund',
      payment.station_id,
    );
    if (payment.status === 'refunded') {
      return mapPayment(payment, payment.qr_payment_transactions);
    }
    if (payment.payment_method !== 'qr' || !payment.qr_payment_transactions) {
      throw new ConflictException(
        'Only confirmed QR payments can be refunded.',
      );
    }
    if (payment.status !== 'confirmed') {
      throw new ConflictException(
        'Only confirmed QR payments can be refunded.',
      );
    }
    this.policy.assertTransition(payment.status, 'refunded');
    const provider = this.providers.byName(
      payment.qr_payment_transactions.provider,
    );
    const refund = await provider.refundTransaction({
      merchantReference: payment.qr_payment_transactions.merchant_reference,
      providerTransactionId:
        payment.qr_payment_transactions.provider_transaction_id,
      amountMinor: payment.received_amount_minor,
      currency: payment.currency,
      idempotencyKey: dto.idempotencyKey ?? randomUUID(),
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.qr_payment_transactions.update({
        where: { payment_id: payment.id },
        data: {
          provider_status: refund.providerStatus,
          provider_transaction_id: refund.providerTransactionId,
          raw_response: sanitizeJson(refund.rawResponse),
        },
      });
      const row = await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: 'refunded',
          refunded_at: new Date(),
          metadata: refundMetadata(payment.metadata, dto),
        },
        include: { qr_payment_transactions: true },
      });
      await this.audit.record(
        {
          actorUserId: actor.id,
          action: 'payments.refunded',
          entityType: 'payments',
          entityId: payment.id,
          stationId: payment.station_id,
          reason: dto.reason,
        },
        tx,
      );
      return row;
    });
    return mapPayment(updated, updated.qr_payment_transactions);
  }
}

function refundMetadata(value: unknown, dto: RefundPaymentDto) {
  const base =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return sanitizeJson({
    ...base,
    refundReason: dto.reason,
    refundIdempotencyKey: dto.idempotencyKey,
  });
}

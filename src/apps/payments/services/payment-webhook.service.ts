import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import { QrProviderRegistry } from '../providers/qr-provider.registry';
import type { QrWebhookEvent } from '../types/payment-provider.type';
import { mapPayment } from '../mappers/payment.mapper';
import { PaymentStatusPolicy } from './payment-status.policy';
import {
  conflictAudit,
  lockedPayment,
  updatePaymentStatus,
} from './payment-webhook-state';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: QrProviderRegistry,
    private readonly audit: AuditLogsService,
    private readonly policy: PaymentStatusPolicy,
  ) {}

  async receive(input: {
    providerName: string;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const provider = this.providers.byName(input.providerName);
    if (!(await provider.verifyWebhook(input))) {
      await this.audit.record({
        action: 'payments.invalid_webhook_signature',
        entityType: 'qr_payment_transactions',
        reason: `Invalid ${input.providerName} webhook signature.`,
      });
      throw new UnauthorizedException('Invalid webhook signature.');
    }
    const event = await provider.parseWebhook(input.rawBody);
    const result = await this.prisma.$transaction(async (tx) =>
      this.applyEvent(tx, input.providerName, event),
    );
    return { received: true, payment: result };
  }

  private async applyEvent(
    tx: Prisma.TransactionClient,
    providerName: string,
    event: QrWebhookEvent,
  ) {
    const qr = await this.findQr(tx, providerName, event);
    if (!qr) throw new NotFoundException('QR transaction not found.');
    const payment = await lockedPayment(tx, qr.payment_id);
    if (!payment) throw new NotFoundException('Payment not found.');
    if (
      event.amountMinor !== qr.amount_minor ||
      event.currency !== qr.currency
    ) {
      await this.audit.record(
        conflictAudit(payment, qr.id, 'Amount mismatch.', event.rawResponse),
        tx,
      );
      throw new BadRequestException('QR callback amount mismatch.');
    }
    if (
      this.policy.isTerminal(payment.status) &&
      payment.status !== event.status
    ) {
      await this.audit.record(
        conflictAudit(payment, qr.id, 'Terminal conflict.', event.rawResponse),
        tx,
      );
      return mapPayment(payment, qr);
    }
    const updated = await updatePaymentStatus(
      tx,
      payment,
      qr,
      event,
      this.policy,
    );
    return mapPayment(updated, updated.qr_payment_transactions);
  }

  private findQr(
    tx: Prisma.TransactionClient,
    providerName: string,
    event: QrWebhookEvent,
  ) {
    return tx.qr_payment_transactions.findFirst({
      where: {
        provider: providerName,
        OR: [
          { merchant_reference: event.merchantReference },
          event.providerTransactionId
            ? { provider_transaction_id: event.providerTransactionId }
            : {},
        ],
      },
    });
  }
}

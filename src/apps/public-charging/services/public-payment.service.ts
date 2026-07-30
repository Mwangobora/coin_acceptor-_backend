import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { payments, qr_payment_transactions } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import { paymentReference } from '../../payments/services/payment-reference';
import { QrPaymentService } from '../../payments/services/qr-payment.service';
import { AnonymousCheckoutService } from './anonymous-checkout.service';
import { AnonymousCustomerFlowService } from './anonymous-customer-flow.service';
import { PublicPackageService } from './public-package.service';
import { publicPaymentMetadata } from './public-payment-metadata';
import { PublicSessionCreationService } from './public-session-creation.service';

type PaymentWithQr = payments & {
  qr_payment_transactions: qr_payment_transactions | null;
};

@Injectable()
export class PublicPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: AnonymousCheckoutService,
    private readonly flows: AnonymousCustomerFlowService,
    private readonly packages: PublicPackageService,
    private readonly qr: QrPaymentService,
    private readonly sessions: PublicSessionCreationService,
    private readonly audit: AuditLogsService,
  ) {}

  async initiate(input: {
    checkoutToken: string;
    packageId: string;
    idempotencyKey: string;
  }) {
    const checkout = await this.checkout.require(input.checkoutToken);
    const pkg = await this.packages.requireForPayment({
      publicPackageId: input.packageId,
      stationId: checkout.stationId,
    });
    const key = `public:${checkout.checkoutHash.slice(0, 24)}:${input.idempotencyKey}`;
    const existing = await this.prisma.payments.findUnique({
      where: { idempotency_key: key },
      include: { qr_payment_transactions: true },
    });
    const payment = existing ?? (await this.createPayment(checkout, pkg, key));
    if (existing) this.assertIdempotent(existing, pkg.id, checkout.deviceId);
    const qr =
      payment.qr_payment_transactions ??
      (await this.qr.createTransaction(payment));
    const flow = await this.flows.issue({
      checkoutHash: checkout.checkoutHash,
      stationId: checkout.stationId,
      deviceId: checkout.deviceId,
      paymentId: payment.id,
      paymentReference: payment.payment_reference,
    });
    await this.audit.record({
      action: 'public_payment.initiated',
      entityType: 'payments',
      entityId: payment.id,
      stationId: payment.station_id,
    });
    return mapPaymentInitiation(payment, qr, flow.customerFlowToken);
  }

  async status(paymentReference: string, flowToken: string) {
    const flow = await this.flows.require(flowToken);
    if (flow.paymentReference !== paymentReference) throw this.notFound();
    const payment = await this.prisma.payments.findUnique({
      where: { payment_reference: paymentReference },
      include: {
        qr_payment_transactions: true,
        charging_session_payments: true,
      },
    });
    if (!payment || payment.id !== flow.paymentId) throw this.notFound();
    const session =
      payment.status === 'confirmed'
        ? await this.sessions.ensureForPaymentReference(paymentReference)
        : null;
    return {
      paymentReference: payment.payment_reference,
      status: payment.status,
      amountMinor: payment.expected_amount_minor.toString(),
      currency: payment.currency,
      expiresAt: payment.qr_payment_transactions?.qr_expires_at,
      failureMessage: safeFailure(payment.failure_reason),
      sessionReference:
        session?.session_reference ?? flow.sessionReference ?? undefined,
      canClaimLockerPin: payment.status === 'confirmed' && !!session,
    };
  }

  private async createPayment(
    checkout: { stationId: string; deviceId: string; checkoutHash: string },
    pkg: { id: string; price_minor: bigint; currency: string },
    idempotencyKey: string,
  ) {
    return this.prisma.payments.create({
      data: {
        payment_reference: paymentReference(),
        station_id: checkout.stationId,
        device_id: checkout.deviceId,
        charging_package_id: pkg.id,
        payment_method: 'qr',
        source: 'mobile',
        status: 'pending',
        expected_amount_minor: pkg.price_minor,
        currency: pkg.currency,
        package_name_snapshot: 'pending',
        package_duration_seconds_snapshot: 1,
        idempotency_key: idempotencyKey,
        metadata: publicPaymentMetadata({
          checkoutHash: checkout.checkoutHash,
        }),
      },
      include: { qr_payment_transactions: true },
    });
  }

  private assertIdempotent(
    payment: PaymentWithQr,
    packageId: string,
    deviceId: string,
  ): void {
    if (
      payment.charging_package_id === packageId &&
      payment.device_id === deviceId
    ) {
      return;
    }
    throw new ConflictException('Payment idempotency key conflicts.');
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Public charging resource not found.');
  }
}

function mapPaymentInitiation(
  payment: payments,
  qr: qr_payment_transactions,
  customerFlowToken: string,
) {
  return {
    paymentReference: payment.payment_reference,
    merchantReference: qr.merchant_reference,
    amountMinor: payment.expected_amount_minor.toString(),
    currency: payment.currency,
    provider: qr.provider,
    paymentInstructions: { qrReference: qr.qr_reference },
    status: payment.status,
    expiresAt: qr.qr_expires_at,
    customerFlowToken,
  };
}

function safeFailure(reason: string | null): string | null {
  return reason ? 'Payment could not be completed.' : null;
}

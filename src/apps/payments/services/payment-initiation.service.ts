import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { payments, qr_payment_transactions } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuthenticatedDevice } from '../../device-ingestion/types/authenticated-device.type';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateDevicePaymentDto } from '../dto/create-device-payment.dto';
import { mapPayment } from '../mappers/payment.mapper';
import { ChargingPackageReadService } from './charging-package-read.service';
import { paymentReference } from './payment-reference';
import { QrPaymentService } from './qr-payment.service';

@Injectable()
export class PaymentInitiationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly packages: ChargingPackageReadService,
    private readonly qr: QrPaymentService,
    private readonly audit: AuditLogsService,
  ) {}

  async initiate(auth: AuthenticatedDevice, dto: CreateDevicePaymentDto) {
    await this.requireActiveDevice(auth.deviceId);
    await this.packages.requireAvailable(
      dto.chargingPackageId,
      auth.stationId,
      dto.paymentMethod,
    );
    const key = dto.idempotencyKey ?? randomUUID();
    const existing = await this.prisma.payments.findUnique({
      where: { idempotency_key: key },
      include: { qr_payment_transactions: true },
    });
    if (existing) return this.idempotent(existing, dto, auth);
    const payment = await this.createPayment(auth, dto, key);
    if (dto.paymentMethod === 'coin') return mapPayment(payment);
    try {
      const qr = await this.qr.createTransaction(payment);
      return mapPayment(payment, qr);
    } catch {
      const failed = await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          failed_at: new Date(),
          failure_code: 'qr_provider_failed',
          failure_reason: 'QR provider transaction could not be created.',
        },
      });
      return mapPayment(failed);
    }
  }

  private async createPayment(
    auth: AuthenticatedDevice,
    dto: CreateDevicePaymentDto,
    idempotencyKey: string,
  ) {
    return this.prisma.payments.create({
      data: {
        payment_reference: paymentReference(),
        station_id: auth.stationId,
        device_id: auth.deviceId,
        charging_package_id: dto.chargingPackageId,
        payment_method: dto.paymentMethod,
        source: 'device',
        expected_amount_minor: 1,
        currency: 'TZS',
        package_name_snapshot: 'pending',
        package_duration_seconds_snapshot: 1,
        idempotency_key: idempotencyKey,
        metadata: {},
      },
    });
  }

  private async idempotent(
    payment: PaymentWithQr,
    dto: CreateDevicePaymentDto,
    auth: AuthenticatedDevice,
  ) {
    if (
      payment &&
      payment.device_id === auth.deviceId &&
      payment.charging_package_id === dto.chargingPackageId &&
      payment.payment_method === dto.paymentMethod
    ) {
      return mapPayment(payment, payment.qr_payment_transactions);
    }
    await this.audit.record({
      action: 'payments.conflicting_idempotency_key',
      entityType: 'payments',
      entityId: payment?.id,
      stationId: auth.stationId,
      reason: 'Payment idempotency key was reused with different input.',
    });
    throw new ConflictException('Payment idempotency key conflicts.');
  }

  private async requireActiveDevice(deviceId: string): Promise<void> {
    const device = await this.prisma.devices.findUnique({
      where: { id: deviceId },
    });
    if (!device || device.lifecycle_status !== 'active') {
      throw new BadRequestException('Device is not active.');
    }
  }
}

type PaymentWithQr = payments & {
  qr_payment_transactions: qr_payment_transactions | null;
};

import { Injectable } from '@nestjs/common';
import { Prisma, type charging_sessions, type payments } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import { paymentIsPublicCustomer } from './public-payment-metadata';
import { AnonymousCustomerFlowService } from './anonymous-customer-flow.service';

type SlotRow = {
  locker_id: string;
  locker_number: number;
  port_id: string;
  port_number: number;
};

@Injectable()
export class PublicSessionCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flows: AnonymousCustomerFlowService,
    private readonly audit: AuditLogsService,
  ) {}

  async ensureForPaymentReference(reference: string) {
    const result = await this.prisma.$transaction((tx) =>
      this.ensureInsideTransaction(tx, reference),
    );
    if (result) {
      await this.flows.bindSession(reference, result.session_reference);
    }
    return result;
  }

  private async ensureInsideTransaction(
    tx: Prisma.TransactionClient,
    reference: string,
  ) {
    const payment = await this.lockPayment(tx, reference);
    if (!payment || payment.status !== 'confirmed') return null;
    if (!paymentIsPublicCustomer(payment.metadata)) return null;
    const existing = await this.findLinkedSession(tx, payment.id);
    if (existing) return existing;
    const slot = await this.reserveSlot(tx, payment);
    if (!slot) {
      await this.alertNoSlot(tx, payment);
      return null;
    }
    const session = await tx.charging_sessions.create({
      data: {
        session_reference: sessionReference(),
        station_id: payment.station_id,
        device_id: payment.device_id,
        locker_id: slot.locker_id,
        charging_port_id: slot.port_id,
        status: 'pending',
        currency: payment.currency,
        metadata: {
          channel: 'public_customer',
          paymentReference: payment.payment_reference,
        },
      },
    });
    await tx.charging_session_payments.create({
      data: {
        charging_session_id: session.id,
        payment_id: payment.id,
        purpose: 'initial',
        duration_seconds_added: payment.package_duration_seconds_snapshot,
        amount_minor: payment.received_amount_minor,
        currency: payment.currency,
      },
    });
    await this.audit.record(
      {
        action: 'public_session.created',
        entityType: 'charging_sessions',
        entityId: session.id,
        stationId: payment.station_id,
        metadata: { paymentReference: payment.payment_reference },
      },
      tx,
    );
    return session;
  }

  private async lockPayment(tx: Prisma.TransactionClient, reference: string) {
    const rows = await tx.$queryRaw<payments[]>`
      SELECT * FROM payments
      WHERE payment_reference = ${reference}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  private async findLinkedSession(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ): Promise<charging_sessions | null> {
    const link = await tx.charging_session_payments.findUnique({
      where: { payment_id: paymentId },
      include: { charging_sessions: true },
    });
    return link?.charging_sessions ?? null;
  }

  private async reserveSlot(tx: Prisma.TransactionClient, payment: payments) {
    const rows = await tx.$queryRaw<SlotRow[]>`
      SELECT l.id AS locker_id,
             l.locker_number,
             p.id AS port_id,
             p.port_number
      FROM lockers l
      JOIN charging_ports p
        ON p.locker_id = l.id AND p.device_id = l.device_id
      WHERE l.device_id = ${payment.device_id}::uuid
        AND l.availability_status = 'available'
        AND p.status = 'available'
        AND NOT EXISTS (
          SELECT 1 FROM charging_sessions s
          WHERE s.status IN ('pending', 'awaiting_device', 'active', 'paused')
            AND (s.locker_id = l.id OR s.charging_port_id = p.id)
        )
      ORDER BY l.locker_number ASC, p.port_number ASC
      LIMIT 1
      FOR UPDATE OF l, p SKIP LOCKED
    `;
    const slot = rows[0];
    if (!slot) return null;
    await tx.lockers.update({
      where: { id: slot.locker_id },
      data: {
        availability_status: 'reserved',
        last_status_changed_at: new Date(),
      },
    });
    return slot;
  }

  private async alertNoSlot(
    tx: Prisma.TransactionClient,
    payment: payments,
  ): Promise<void> {
    const deduplicationKey = `public-no-slot:${payment.device_id}`;
    const existing = await tx.alerts.findFirst({
      where: { deduplication_key: deduplicationKey, status: 'open' },
    });
    if (existing) return;
    await tx.alerts.create({
      data: {
        station_id: payment.station_id,
        device_id: payment.device_id,
        alert_code: 'PUBLIC_SLOT_UNAVAILABLE',
        category: 'session',
        severity: 'warning',
        title: 'Public charging slot unavailable',
        message: 'A confirmed public QR payment could not reserve a slot.',
        detected_at: new Date(),
        deduplication_key: deduplicationKey,
        metadata: { paymentReference: payment.payment_reference },
      },
    });
  }
}

function sessionReference(): string {
  return `SESSION-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

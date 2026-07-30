import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { AnonymousCustomerFlowService } from './anonymous-customer-flow.service';

@Injectable()
export class PublicSessionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flows: AnonymousCustomerFlowService,
  ) {}

  async get(sessionReference: string, flowToken: string) {
    const flow = await this.flows.require(flowToken);
    if (flow.sessionReference && flow.sessionReference !== sessionReference) {
      throw this.notFound();
    }
    const session = await this.prisma.charging_sessions.findUnique({
      where: { session_reference: sessionReference },
      include: {
        devices: true,
        lockers: true,
        charging_ports: true,
        charging_session_payments: { include: { payments: true } },
      },
    });
    if (!session) throw this.notFound();
    const station = await this.prisma.stations.findUnique({
      where: { id: session.station_id },
    });
    const payment = session.charging_session_payments[0]?.payments;
    if (!payment || payment.payment_reference !== flow.paymentReference) {
      throw this.notFound();
    }
    return {
      sessionReference: session.session_reference,
      status: session.status,
      lockerNumber: session.lockers.locker_number,
      portNumber: session.charging_ports.port_number,
      stationName: station?.name ?? 'Charging station',
      deviceName: session.devices.name,
      packageName: payment.package_name_snapshot,
      amountPaid: session.total_paid_minor.toString(),
      currency: session.currency,
      purchasedDurationSeconds: session.purchased_duration_seconds,
      remainingSeconds: session.remaining_seconds,
      startedAt: session.started_at,
      expectedEndAt: session.expected_end_at,
      endedAt: session.ended_at,
      guidance: guidance(session.status, !!session.access_code_hash),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Public charging resource not found.');
  }
}

function guidance(status: string, codeClaimed: boolean): string {
  if (status === 'pending' && !codeClaimed) return 'payment_confirmed';
  if (status === 'pending') return 'enter_access_code';
  if (status === 'awaiting_device') return 'connect_phone';
  if (status === 'active') return 'charging';
  if (status === 'completed') return 'collect_phone';
  if (['stopped', 'cancelled', 'expired'].includes(status))
    return 'session_finished';
  return 'device_error';
}

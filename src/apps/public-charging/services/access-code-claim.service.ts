import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type charging_sessions } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  ACCESS_CODE_TTL_SECONDS,
  PUBLIC_COMMAND_TYPE,
} from '../constants/public-charging.constants';
import { AccessCodeGenerationService } from './access-code-generation.service';
import { AccessCodeVerifierService } from './access-code-verifier.service';
import { AnonymousCustomerFlowService } from './anonymous-customer-flow.service';

@Injectable()
export class AccessCodeClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flows: AnonymousCustomerFlowService,
    private readonly generator: AccessCodeGenerationService,
    private readonly verifiers: AccessCodeVerifierService,
    private readonly audit: AuditLogsService,
  ) {}

  async claim(sessionReference: string, flowToken: string) {
    const flow = await this.flows.require(flowToken);
    const session = await this.prisma.charging_sessions.findUnique({
      where: { session_reference: sessionReference },
      include: { lockers: true, charging_ports: true },
    });
    if (!session || flow.sessionReference !== sessionReference) {
      throw this.notFound();
    }
    if (
      ['completed', 'stopped', 'failed', 'cancelled', 'expired'].includes(
        session.status,
      )
    ) {
      throw new ConflictException('Charging session is terminal.');
    }
    await this.requirePayment(flow.paymentReference, session.id);
    if (session.access_code_hash) {
      await this.audit.record({
        action: 'public_access_code.replay_attempt',
        entityType: 'charging_sessions',
        entityId: session.id,
        stationId: session.station_id,
      });
      throw new ConflictException('ACCESS_CODE_ALREADY_CLAIMED');
    }
    const pin = this.generator.generate();
    const verifier = await this.verifiers.verifier({
      deviceId: session.device_id,
      sessionReference,
      lockerNumber: session.lockers.locker_number,
      pin,
    });
    const expiresAt = new Date(Date.now() + ACCESS_CODE_TTL_SECONDS * 1000);
    await this.storeVerifierAndCommand(session, verifier, expiresAt, {
      lockerNumber: session.lockers.locker_number,
      portNumber: session.charging_ports.port_number,
    });
    return {
      sessionReference,
      lockerNumber: session.lockers.locker_number,
      portNumber: session.charging_ports.port_number,
      accessCode: pin,
      chargingDurationSeconds: session.purchased_duration_seconds,
      accessCodeExpiresAt: expiresAt,
      instructions: [
        'Enter this code on the charging machine keypad.',
        'Place the phone inside the displayed locker.',
        'Keep the code private because it will be required to retrieve the phone.',
      ],
    };
  }

  private async requirePayment(paymentReference: string, sessionId: string) {
    const link = await this.prisma.charging_session_payments.findFirst({
      where: {
        charging_session_id: sessionId,
        payments: { payment_reference: paymentReference, status: 'confirmed' },
      },
    });
    if (!link) throw this.notFound();
  }

  private async storeVerifierAndCommand(
    session: charging_sessions,
    verifier: string,
    expiresAt: Date,
    slot: { lockerNumber: number; portNumber: number },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await lockSession(tx, session.session_reference);
      if (!locked || locked.access_code_hash) {
        throw new ConflictException('ACCESS_CODE_ALREADY_CLAIMED');
      }
      await tx.charging_sessions.update({
        where: { id: session.id },
        data: {
          access_code_hash: verifier,
          access_code_expires_at: expiresAt,
        },
      });
      await tx.device_commands.upsert({
        where: { idempotency_key: `public-prepare:${session.id}` },
        create: {
          station_id: session.station_id,
          device_id: session.device_id,
          command_type: PUBLIC_COMMAND_TYPE,
          payload: commandPayload(session, verifier, slot),
          idempotency_key: `public-prepare:${session.id}`,
          expires_at: expiresAt,
        },
        update: {},
      });
      await this.audit.record(
        {
          action: 'public_access_code.claimed',
          entityType: 'charging_sessions',
          entityId: session.id,
          stationId: session.station_id,
        },
        tx,
      );
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Public charging resource not found.');
  }
}

async function lockSession(
  tx: Prisma.TransactionClient,
  sessionReference: string,
): Promise<charging_sessions | null> {
  const rows = await tx.$queryRaw<charging_sessions[]>`
    SELECT * FROM charging_sessions
    WHERE session_reference = ${sessionReference}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

function commandPayload(
  session: charging_sessions,
  verifier: string,
  slot: { lockerNumber: number; portNumber: number },
): Prisma.InputJsonObject {
  return {
    sessionReference: session.session_reference,
    lockerNumber: slot.lockerNumber,
    portNumber: slot.portNumber,
    durationSeconds: session.purchased_duration_seconds,
    accessCodeVerifier: verifier,
  };
}

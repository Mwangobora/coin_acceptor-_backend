import { Injectable } from '@nestjs/common';
import type { charging_ports } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateChargingPortStatusDto } from '../dto/update-charging-port-status.dto';
import { mapChargingPort } from '../mappers/charging-port.mapper';
import { ChargingPortAuditBuilder } from './charging-port-audit.builder';
import { ChargingPortStatusPolicy } from './charging-port-status.policy';

@Injectable()
export class ChargingPortStatusOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly audits: ChargingPortAuditBuilder,
    private readonly policy: ChargingPortStatusPolicy,
  ) {}

  async execute(
    before: charging_ports & { devices: { station_id: string } },
    activeSessionCount: number,
    dto: UpdateChargingPortStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    this.policy.validate({
      port: before,
      nextStatus: dto.status,
      reason: dto.reason,
      activeSessionCount,
    });
    const port = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.charging_ports.update({
        where: { id: before.id },
        data: this.policy.data(dto.status, dto.reason),
      });
      await this.audit.record(
        this.audits.build({
          action: 'charging_ports.status_changed',
          after: updated,
          stationId: before.devices.station_id,
          actorUserId: actor.id,
          meta,
          before,
          reason: dto.reason,
        }),
        tx,
      );
      return updated;
    });
    return mapChargingPort(port);
  }
}

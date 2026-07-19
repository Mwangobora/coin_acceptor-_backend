import { Injectable } from '@nestjs/common';
import type { charging_ports } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateChargingPortDto } from '../dto/update-charging-port.dto';
import { mapChargingPort } from '../mappers/charging-port.mapper';
import { ChargingPortAuditBuilder } from './charging-port-audit.builder';
import { ChargingPortDataFactory } from './charging-port-data.factory';

@Injectable()
export class ChargingPortUpdateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly dataFactory: ChargingPortDataFactory,
    private readonly audits: ChargingPortAuditBuilder,
  ) {}

  async execute(
    before: charging_ports & { devices: { station_id: string } },
    dto: UpdateChargingPortDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const port = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.charging_ports.update({
        where: { id: before.id },
        data: this.dataFactory.update(dto),
      });
      await this.audit.record(
        this.audits.build({
          action: 'charging_ports.updated',
          after: updated,
          stationId: before.devices.station_id,
          actorUserId: actor.id,
          meta,
          before,
        }),
        tx,
      );
      return updated;
    });
    return mapChargingPort(port);
  }
}

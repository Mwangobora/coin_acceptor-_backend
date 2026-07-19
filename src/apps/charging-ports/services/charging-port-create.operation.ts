import { Injectable } from '@nestjs/common';
import type { lockers } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateChargingPortDto } from '../dto/create-charging-port.dto';
import { mapChargingPort } from '../mappers/charging-port.mapper';
import { ChargingPortAuditBuilder } from './charging-port-audit.builder';
import { ChargingPortDataFactory } from './charging-port-data.factory';

@Injectable()
export class ChargingPortCreateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly dataFactory: ChargingPortDataFactory,
    private readonly audits: ChargingPortAuditBuilder,
  ) {}

  async execute(
    locker: lockers & { devices: { station_id: string } },
    dto: CreateChargingPortDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    try {
      const port = await this.prisma.$transaction(async (tx) => {
        const created = await tx.charging_ports.create({
          data: this.dataFactory.create(locker, dto),
        });
        await this.audit.record(
          this.audits.build({
            action: 'charging_ports.created',
            after: created,
            stationId: locker.devices.station_id,
            actorUserId: actor.id,
            meta,
          }),
          tx,
        );
        return created;
      });
      return mapChargingPort(port);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Charging port already exists.' });
    }
  }
}

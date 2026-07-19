import { Injectable } from '@nestjs/common';
import type { lockers } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateLockerDto } from '../dto/update-locker.dto';
import { mapLocker } from '../mappers/locker.mapper';
import { LockerAuditBuilder } from './locker-audit.builder';

@Injectable()
export class LockerUpdateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly audits: LockerAuditBuilder,
  ) {}

  async execute(
    before: lockers & { devices: { station_id: string } },
    dto: UpdateLockerDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const locker = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lockers.update({
        where: { id: before.id },
        data: { label: dto.label },
      });
      await this.audit.record(
        this.audits.build({
          action: 'lockers.updated',
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
    return mapLocker(locker);
  }
}

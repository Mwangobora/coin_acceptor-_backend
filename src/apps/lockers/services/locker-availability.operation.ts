import { Injectable } from '@nestjs/common';
import type { lockers } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateLockerAvailabilityDto } from '../dto/update-locker-availability.dto';
import { mapLocker } from '../mappers/locker.mapper';
import { LockerAuditBuilder } from './locker-audit.builder';
import { LockerAvailabilityPolicy } from './locker-availability.policy';

@Injectable()
export class LockerAvailabilityOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly audits: LockerAuditBuilder,
    private readonly policy: LockerAvailabilityPolicy,
  ) {}

  async execute(
    before: lockers & { devices: { station_id: string } },
    activeSessionCount: number,
    dto: UpdateLockerAvailabilityDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    this.policy.validate({
      locker: before,
      nextStatus: dto.availabilityStatus,
      reason: dto.reason,
      activeSessionCount,
    });
    const locker = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lockers.update({
        where: { id: before.id },
        data: this.policy.data(dto.availabilityStatus, dto.reason),
      });
      await this.audit.record(
        this.audits.build({
          action: 'lockers.availability_changed',
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
    return mapLocker(locker);
  }
}

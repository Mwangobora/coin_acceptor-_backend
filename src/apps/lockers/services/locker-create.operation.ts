import { Injectable } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateLockerDto } from '../dto/create-locker.dto';
import { mapLocker } from '../mappers/locker.mapper';
import { LockerAuditBuilder } from './locker-audit.builder';

@Injectable()
export class LockerCreateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly audits: LockerAuditBuilder,
  ) {}

  async execute(
    deviceId: string,
    stationId: string,
    dto: CreateLockerDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    try {
      const locker = await this.prisma.$transaction(async (tx) => {
        const created = await tx.lockers.create({
          data: {
            device_id: deviceId,
            locker_number: dto.lockerNumber,
            label: dto.label,
          },
        });
        await this.audit.record(
          this.audits.build({
            action: 'lockers.created',
            after: created,
            stationId,
            actorUserId: actor.id,
            meta,
          }),
          tx,
        );
        return created;
      });
      return mapLocker(locker);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Locker number already exists.' });
    }
  }
}

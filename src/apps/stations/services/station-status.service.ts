import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateStationStatusDto } from '../dto/update-station-status.dto';
import { mapStation } from '../mappers/station.mapper';
import { StationAuditBuilder } from './station-audit.builder';
import { StationRecordService } from './station-record.service';
import { StationStatusPolicy } from './station-status.policy';

@Injectable()
export class StationStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly scope: StationScopeService,
    private readonly auditBuilder: StationAuditBuilder,
    private readonly records: StationRecordService,
    private readonly statusPolicy: StationStatusPolicy,
  ) {}

  async updateStatus(
    id: string,
    dto: UpdateStationStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    await this.scope.requireStation(actor.id, 'stations.deactivate', id);
    const station = await this.prisma.$transaction(async (tx) => {
      const before = await this.records.require(id, tx);
      const activeDeviceCount = await tx.devices.count({
        where: { station_id: id, lifecycle_status: { not: 'decommissioned' } },
      });
      this.statusPolicy.validate({
        currentStatus: before.status,
        nextStatus: dto.status,
        reason: dto.reason,
        activeDeviceCount,
      });
      const updated = await tx.stations.update({
        where: { id },
        data: { status: dto.status },
      });
      await this.audit.record(
        this.auditBuilder.build({
          action: 'stations.status_changed',
          actorUserId: actor.id,
          after: updated,
          before,
          reason: dto.reason,
          meta,
        }),
        tx,
      );
      return updated;
    });
    return mapStation(station);
  }
}

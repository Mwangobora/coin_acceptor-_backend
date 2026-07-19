import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { UpdateDeviceLifecycleDto } from '../dto/update-device-lifecycle.dto';
import { mapDevice } from '../mappers/device.mapper';
import { DeviceAuditBuilder } from './device-audit.builder';
import { DeviceLifecyclePolicy } from './device-lifecycle.policy';
import { DeviceRecordService } from './device-record.service';

@Injectable()
export class DeviceLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly scope: StationScopeService,
    private readonly auditBuilder: DeviceAuditBuilder,
    private readonly lifecycle: DeviceLifecyclePolicy,
    private readonly records: DeviceRecordService,
  ) {}

  async updateLifecycle(
    id: string,
    dto: UpdateDeviceLifecycleDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const device = await this.prisma.$transaction(async (tx) => {
      const before = await this.records.require(id, tx);
      await this.scope.requireStation(
        actor.id,
        'devices.disable',
        before.station_id,
      );
      this.lifecycle.validate({
        currentStatus: before.lifecycle_status,
        nextStatus: dto.lifecycleStatus,
        reason: dto.reason,
        activeSessionCount: await this.records.activeSessionCount(id, tx),
      });
      const updated = await tx.devices.update({
        where: { id },
        data: this.lifecycle.transitionData(before, dto.lifecycleStatus),
      });
      await this.audit.record(
        this.auditBuilder.build({
          action: 'devices.lifecycle_status_changed',
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
    return mapDevice(device);
  }
}

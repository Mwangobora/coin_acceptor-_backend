import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateDeviceDto } from '../dto/create-device.dto';
import type { UpdateDeviceDto } from '../dto/update-device.dto';
import { mapDevice } from '../mappers/device.mapper';
import { DeviceAdminPolicyService } from './device-admin-policy.service';
import { DeviceAuditBuilder } from './device-audit.builder';
import { DeviceDataFactory } from './device-data.factory';
import { DeviceRecordService } from './device-record.service';

@Injectable()
export class DeviceWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly scope: StationScopeService,
    private readonly adminPolicy: DeviceAdminPolicyService,
    private readonly dataFactory: DeviceDataFactory,
    private readonly auditBuilder: DeviceAuditBuilder,
    private readonly records: DeviceRecordService,
  ) {}

  async create(
    dto: CreateDeviceDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    await this.scope.requireStation(actor.id, 'devices.create', dto.stationId);
    this.validateCreate(dto);
    try {
      const device = await this.prisma.$transaction(async (tx) => {
        await this.adminPolicy.validateStationAssignable(dto.stationId, tx);
        const created = await tx.devices.create({
          data: this.dataFactory.create(dto, actor.id),
        });
        await this.audit.record(
          this.auditBuilder.build({
            action: 'devices.created',
            actorUserId: actor.id,
            after: created,
            meta,
          }),
          tx,
        );
        return created;
      });
      return mapDevice(device);
    } catch (error) {
      mapPrismaError(error, {
        P2002: 'Device code or serial number already exists.',
      });
    }
  }

  async update(
    id: string,
    dto: UpdateDeviceDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const device = await this.prisma.$transaction(async (tx) => {
      const before = await this.records.require(id, tx);
      await this.scope.requireStation(
        actor.id,
        'devices.update',
        before.station_id,
      );
      if (dto.stationId && dto.stationId !== before.station_id) {
        await this.adminPolicy.validateStationChange({
          device: before,
          stationId: dto.stationId,
          actorId: actor.id,
          client: tx,
        });
      }
      const updated = await tx.devices.update({
        where: { id },
        data: this.dataFactory.update(dto),
      });
      await this.audit.record(
        this.auditBuilder.build({
          action: stationAction(dto.stationId, before.station_id),
          actorUserId: actor.id,
          after: updated,
          before,
          meta,
        }),
        tx,
      );
      return updated;
    });
    return mapDevice(device);
  }

  private validateCreate(dto: CreateDeviceDto): void {
    this.adminPolicy.validateText(dto.deviceCode, 'Device code');
    this.adminPolicy.validateText(dto.serialNumber, 'Serial number');
    this.adminPolicy.validateText(dto.name, 'Name');
  }
}

function stationAction(
  stationId: string | undefined,
  previousStationId: string,
) {
  return stationId && stationId !== previousStationId
    ? 'devices.station_changed'
    : 'devices.updated';
}

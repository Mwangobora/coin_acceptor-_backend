import { BadRequestException, Injectable } from '@nestjs/common';
import type { devices } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateLockerDto } from '../dto/create-locker.dto';
import type { LockerQueryDto } from '../dto/locker-query.dto';
import type { UpdateLockerAvailabilityDto } from '../dto/update-locker-availability.dto';
import type { UpdateLockerDto } from '../dto/update-locker.dto';
import { LockerAvailabilityOperation } from './locker-availability.operation';
import { LockerCreateOperation } from './locker-create.operation';
import { LockerReadOperation } from './locker-read.operation';
import { LockerRecordService } from './locker-record.service';
import { LockerUpdateOperation } from './locker-update.operation';

@Injectable()
export class LockersService {
  constructor(
    private readonly scope: StationScopeService,
    private readonly records: LockerRecordService,
    private readonly reader: LockerReadOperation,
    private readonly creator: LockerCreateOperation,
    private readonly updater: LockerUpdateOperation,
    private readonly availability: LockerAvailabilityOperation,
  ) {}

  async list(query: LockerQueryDto, actor: AuthenticatedUser) {
    return this.reader.list(query, actor);
  }

  listForDevice(
    deviceId: string,
    query: LockerQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.reader.listForDevice(deviceId, query, actor);
  }

  async create(
    deviceId: string,
    dto: CreateLockerDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const device = await this.records.requireDevice(deviceId);
    await this.scope.requireStation(
      actor.id,
      'lockers.configure',
      device.station_id,
    );
    this.validateDevice(device);
    return this.creator.execute(deviceId, device.station_id, dto, actor, meta);
  }

  async get(id: string, actor: AuthenticatedUser) {
    return this.reader.get(id, actor);
  }

  async update(
    id: string,
    dto: UpdateLockerDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.records.requireLocker(id);
    await this.scope.requireStation(
      actor.id,
      'lockers.configure',
      before.devices.station_id,
    );
    return this.updater.execute(before, dto, actor, meta);
  }

  async updateAvailability(
    id: string,
    dto: UpdateLockerAvailabilityDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.records.requireLocker(id);
    await this.scope.requireStation(
      actor.id,
      'lockers.configure',
      before.devices.station_id,
    );
    const activeSessionCount = await this.records.activeSessionCount(id);
    return this.availability.execute(
      before,
      activeSessionCount,
      dto,
      actor,
      meta,
    );
  }

  private validateDevice(device: devices): void {
    if (['disabled', 'decommissioned'].includes(device.lifecycle_status)) {
      throw new BadRequestException('Device cannot receive lockers.');
    }
  }
}

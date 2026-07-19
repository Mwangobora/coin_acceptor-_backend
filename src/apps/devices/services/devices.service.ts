import { Injectable } from '@nestjs/common';

import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateDeviceDto } from '../dto/create-device.dto';
import type { DeviceQueryDto } from '../dto/device-query.dto';
import type { UpdateDeviceLifecycleDto } from '../dto/update-device-lifecycle.dto';
import type { UpdateDeviceDto } from '../dto/update-device.dto';
import { DeviceLifecycleService } from './device-lifecycle.service';
import { DeviceReadService } from './device-read.service';
import { DeviceWriteService } from './device-write.service';

@Injectable()
export class DevicesService {
  constructor(
    private readonly reads: DeviceReadService,
    private readonly writes: DeviceWriteService,
    private readonly lifecycles: DeviceLifecycleService,
  ) {}

  list(query: DeviceQueryDto, actor: AuthenticatedUser) {
    return this.reads.list(query, actor);
  }

  listForStation(
    stationId: string,
    query: DeviceQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.reads.listForStation(stationId, query, actor);
  }

  create(
    dto: CreateDeviceDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.writes.create(dto, actor, meta);
  }

  get(id: string, actor: AuthenticatedUser) {
    return this.reads.get(id, actor);
  }

  update(
    id: string,
    dto: UpdateDeviceDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.writes.update(id, dto, actor, meta);
  }

  updateLifecycle(
    id: string,
    dto: UpdateDeviceLifecycleDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.lifecycles.updateLifecycle(id, dto, actor, meta);
  }
}

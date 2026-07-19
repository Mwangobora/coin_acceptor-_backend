import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { ChargingPortQueryDto } from '../dto/charging-port-query.dto';
import type { CreateChargingPortDto } from '../dto/create-charging-port.dto';
import type { UpdateChargingPortStatusDto } from '../dto/update-charging-port-status.dto';
import type { UpdateChargingPortDto } from '../dto/update-charging-port.dto';
import { ChargingPortAdminPolicy } from './charging-port-admin.policy';
import { ChargingPortCreateOperation } from './charging-port-create.operation';
import { ChargingPortReadOperation } from './charging-port-read.operation';
import { ChargingPortRecordService } from './charging-port-record.service';
import { ChargingPortStatusOperation } from './charging-port-status.operation';
import { ChargingPortUpdateOperation } from './charging-port-update.operation';

@Injectable()
export class ChargingPortsService {
  constructor(
    private readonly scope: StationScopeService,
    private readonly records: ChargingPortRecordService,
    private readonly adminPolicy: ChargingPortAdminPolicy,
    private readonly reader: ChargingPortReadOperation,
    private readonly creator: ChargingPortCreateOperation,
    private readonly updater: ChargingPortUpdateOperation,
    private readonly statusUpdater: ChargingPortStatusOperation,
  ) {}

  async list(query: ChargingPortQueryDto, actor: AuthenticatedUser) {
    return this.reader.list(query, actor);
  }

  listForLocker(
    lockerId: string,
    query: ChargingPortQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.reader.listForLocker(lockerId, query, actor);
  }

  async create(
    lockerId: string,
    dto: CreateChargingPortDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const locker = await this.records.requireLocker(lockerId);
    await this.scope.requireStation(
      actor.id,
      'charging_ports.configure',
      locker.devices.station_id,
    );
    await this.adminPolicy.validateCreate(locker, dto);
    return this.creator.execute(locker, dto, actor, meta);
  }

  async get(id: string, actor: AuthenticatedUser) {
    return this.reader.get(id, actor);
  }

  async update(
    id: string,
    dto: UpdateChargingPortDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.records.requirePort(id);
    await this.scope.requireStation(
      actor.id,
      'charging_ports.configure',
      before.devices.station_id,
    );
    await this.adminPolicy.validateUpdate(before, dto);
    return this.updater.execute(before, dto, actor, meta);
  }

  async updateStatus(
    id: string,
    dto: UpdateChargingPortStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.records.requirePort(id);
    await this.scope.requireStation(
      actor.id,
      'charging_ports.configure',
      before.devices.station_id,
    );
    return this.statusUpdater.execute(
      before,
      await this.records.activeSessionCount(id),
      dto,
      actor,
      meta,
    );
  }
}

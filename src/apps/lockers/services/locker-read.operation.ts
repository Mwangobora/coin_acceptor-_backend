import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { LockerQueryDto } from '../dto/locker-query.dto';
import { mapLocker } from '../mappers/locker.mapper';
import { LockerQueryBuilder } from './locker-query.builder';
import { LockerRecordService } from './locker-record.service';

@Injectable()
export class LockerReadOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly queryBuilder: LockerQueryBuilder,
    private readonly records: LockerRecordService,
  ) {}

  async list(query: LockerQueryDto, actor: AuthenticatedUser) {
    const deviceScope = await this.scope.deviceWhere(actor.id, 'lockers.read');
    const where: Prisma.lockersWhereInput = {
      ...this.queryBuilder.filterWhere(query),
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lockers.findMany({
        where,
        orderBy: this.queryBuilder.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.lockers.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapLocker(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  listForDevice(
    deviceId: string,
    query: LockerQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.list({ ...query, deviceId }, actor);
  }

  async get(id: string, actor: AuthenticatedUser) {
    const locker = await this.records.requireLocker(id);
    await this.scope.requireStation(
      actor.id,
      'lockers.read',
      locker.devices.station_id,
    );
    return mapLocker(locker, await this.records.summary(id));
  }
}

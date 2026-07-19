import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { DeviceQueryDto } from '../dto/device-query.dto';
import { mapDevice } from '../mappers/device.mapper';
import { DeviceQueryBuilder } from './device-query.builder';
import { DeviceRecordService } from './device-record.service';
import { DeviceSummaryService } from './device-summary.service';

@Injectable()
export class DeviceReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly queryBuilder: DeviceQueryBuilder,
    private readonly records: DeviceRecordService,
    private readonly summaries: DeviceSummaryService,
  ) {}

  async list(query: DeviceQueryDto, actor: AuthenticatedUser) {
    const where = {
      ...(await this.scope.deviceWhere(actor.id, 'devices.read')),
      ...this.queryBuilder.filterWhere(query),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.devices.findMany({
        where,
        orderBy: this.queryBuilder.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.devices.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapDevice(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  listForStation(
    stationId: string,
    query: DeviceQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.list({ ...query, stationId }, actor);
  }

  async get(id: string, actor: AuthenticatedUser) {
    const device = await this.records.require(id, this.prisma);
    await this.scope.requireStation(
      actor.id,
      'devices.read',
      device.station_id,
    );
    return mapDevice(device, await this.summaries.forDevice(id));
  }
}

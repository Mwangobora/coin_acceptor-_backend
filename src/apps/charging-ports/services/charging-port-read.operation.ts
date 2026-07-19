import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { ChargingPortQueryDto } from '../dto/charging-port-query.dto';
import { mapChargingPort } from '../mappers/charging-port.mapper';
import { ChargingPortQueryBuilder } from './charging-port-query.builder';
import { ChargingPortRecordService } from './charging-port-record.service';

@Injectable()
export class ChargingPortReadOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly queryBuilder: ChargingPortQueryBuilder,
    private readonly records: ChargingPortRecordService,
  ) {}

  async list(query: ChargingPortQueryDto, actor: AuthenticatedUser) {
    const deviceScope = await this.scope.deviceWhere(
      actor.id,
      'charging_ports.read',
    );
    const where: Prisma.charging_portsWhereInput = {
      ...this.queryBuilder.filterWhere(query),
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.charging_ports.findMany({
        where,
        orderBy: this.queryBuilder.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.charging_ports.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapChargingPort(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  listForLocker(
    lockerId: string,
    query: ChargingPortQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.list({ ...query, lockerId }, actor);
  }

  async get(id: string, actor: AuthenticatedUser) {
    const port = await this.records.requirePort(id);
    await this.scope.requireStation(
      actor.id,
      'charging_ports.read',
      port.devices.station_id,
    );
    return mapChargingPort(port, {
      hasActiveSession: (await this.records.activeSessionCount(id)) > 0,
    });
  }
}

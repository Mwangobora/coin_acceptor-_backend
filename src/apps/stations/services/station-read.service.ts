import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { StationQueryDto } from '../dto/station-query.dto';
import { mapStation } from '../mappers/station.mapper';
import { StationQueryBuilder } from './station-query.builder';
import { StationRecordService } from './station-record.service';
import { StationSummaryService } from './station-summary.service';

@Injectable()
export class StationReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly queryBuilder: StationQueryBuilder,
    private readonly records: StationRecordService,
    private readonly summaries: StationSummaryService,
  ) {}

  async list(query: StationQueryDto, actor: AuthenticatedUser) {
    const where = {
      ...(await this.scope.stationWhere(actor.id, 'stations.read')),
      ...this.queryBuilder.filterWhere(query),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stations.findMany({
        where,
        orderBy: this.queryBuilder.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.stations.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapStation(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string, actor: AuthenticatedUser) {
    await this.scope.requireStation(actor.id, 'stations.read', id);
    const station = await this.records.require(id, this.prisma);
    return mapStation(station, await this.summaries.forStation(id));
  }
}

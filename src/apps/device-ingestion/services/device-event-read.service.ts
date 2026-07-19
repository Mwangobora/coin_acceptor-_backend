import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { DeviceEventQueryDto } from '../dto/device-event-query.dto';
import { mapDeviceEvent } from '../mappers/device-event.mapper';

@Injectable()
export class DeviceEventReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
  ) {}

  async list(query: DeviceEventQueryDto, actor: AuthenticatedUser) {
    const where = await this.where(query, actor.id);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.device_events.findMany({
        where,
        orderBy: this.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.device_events.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapDeviceEvent(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string, actor: AuthenticatedUser) {
    const event = await this.prisma.device_events.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Device event not found.');
    await this.scope.requireStation(
      actor.id,
      'device_events.read',
      event.station_id,
    );
    return mapDeviceEvent(event, true);
  }

  private async where(query: DeviceEventQueryDto, userId: string) {
    const deviceScope = await this.scope.deviceWhere(
      userId,
      'device_events.read',
    );
    return {
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.eventCategory ? { event_category: query.eventCategory } : {}),
      ...(query.eventType ? { event_type: query.eventType } : {}),
      ...(query.processingStatus
        ? { processing_status: query.processingStatus }
        : {}),
      ...(query.externalEventId
        ? { external_event_id: query.externalEventId }
        : {}),
      ...(query.occurredFrom || query.occurredTo
        ? this.dateRange('occurred_at', query.occurredFrom, query.occurredTo)
        : {}),
      ...(query.receivedFrom || query.receivedTo
        ? this.dateRange('received_at', query.receivedFrom, query.receivedTo)
        : {}),
    } satisfies Prisma.device_eventsWhereInput;
  }

  private dateRange(field: string, from?: string, to?: string) {
    return {
      [field]: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  private orderBy(
    sortBy = 'receivedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.device_eventsOrderByWithRelationInput[] {
    const fields = {
      occurredAt: 'occurred_at',
      receivedAt: 'received_at',
      eventType: 'event_type',
      processingStatus: 'processing_status',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'received_at';
    return [{ [field]: sortOrder }, { id: 'asc' }];
  }
}

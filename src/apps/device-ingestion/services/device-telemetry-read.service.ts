import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { DeviceTelemetryQueryDto } from '../dto/device-telemetry-query.dto';
import { mapDeviceTelemetry } from '../mappers/device-telemetry.mapper';

@Injectable()
export class DeviceTelemetryReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
  ) {}

  async list(query: DeviceTelemetryQueryDto, actor: AuthenticatedUser) {
    const where = await this.where(query, actor.id);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.device_telemetry.findMany({
        where,
        orderBy: this.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.device_telemetry.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapDeviceTelemetry),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string, actor: AuthenticatedUser) {
    const item = await this.prisma.device_telemetry.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Device telemetry not found.');
    await this.scope.requireStation(
      actor.id,
      'device_telemetry.read',
      item.station_id,
    );
    return mapDeviceTelemetry(item);
  }

  async latestForDevice(deviceId: string, actor: AuthenticatedUser) {
    const device = await this.prisma.devices.findUnique({
      where: { id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found.');
    await this.scope.requireStation(
      actor.id,
      'device_telemetry.read',
      device.station_id,
    );
    const item = await this.prisma.device_telemetry.findFirst({
      where: { device_id: deviceId },
      orderBy: { observed_at: 'desc' },
    });
    if (!item) throw new NotFoundException('Device telemetry not found.');
    return mapDeviceTelemetry(item);
  }

  private async where(query: DeviceTelemetryQueryDto, userId: string) {
    const deviceScope = await this.scope.deviceWhere(
      userId,
      'device_telemetry.read',
    );
    return {
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.powerSource ? { power_source: query.powerSource } : {}),
      ...(query.faultCode ? { fault_code: query.faultCode } : {}),
      ...(query.observedFrom || query.observedTo
        ? {
            observed_at: {
              ...(query.observedFrom
                ? { gte: new Date(query.observedFrom) }
                : {}),
              ...(query.observedTo ? { lte: new Date(query.observedTo) } : {}),
            },
          }
        : {}),
    } satisfies Prisma.device_telemetryWhereInput;
  }

  private orderBy(
    sortBy = 'observedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.device_telemetryOrderByWithRelationInput[] {
    const fields = {
      observedAt: 'observed_at',
      createdAt: 'created_at',
      powerSource: 'power_source',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'observed_at';
    return [{ [field]: sortOrder }, { id: 'asc' }];
  }
}

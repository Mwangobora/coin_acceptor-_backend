import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { DeviceQueryDto } from '../dto/device-query.dto';

@Injectable()
export class DeviceQueryBuilder {
  filterWhere(query: DeviceQueryDto): Prisma.devicesWhereInput {
    return {
      ...(query.stationId ? { station_id: query.stationId } : {}),
      ...(query.lifecycleStatus
        ? { lifecycle_status: query.lifecycleStatus }
        : {}),
      ...(query.connectivityStatus
        ? { connectivity_status: query.connectivityStatus }
        : {}),
      ...(query.operationalStatus
        ? { operational_status: query.operationalStatus }
        : {}),
      ...(query.currentPowerSource
        ? { current_power_source: query.currentPowerSource }
        : {}),
      ...(query.search ? { OR: this.searchFields(query.search) } : {}),
      ...this.lastSeenWhere(query),
    };
  }

  orderBy(
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.devicesOrderByWithRelationInput[] {
    const fields = {
      deviceCode: 'device_code',
      name: 'name',
      lifecycleStatus: 'lifecycle_status',
      lastSeenAt: 'last_seen_at',
      createdAt: 'created_at',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [{ [field]: sortOrder }, { id: 'asc' }];
  }

  private lastSeenWhere(query: DeviceQueryDto): Prisma.devicesWhereInput {
    if (!query.lastSeenFrom && !query.lastSeenTo) return {};
    return {
      last_seen_at: {
        ...(query.lastSeenFrom ? { gte: new Date(query.lastSeenFrom) } : {}),
        ...(query.lastSeenTo ? { lte: new Date(query.lastSeenTo) } : {}),
      },
    };
  }

  private searchFields(search: string): Prisma.devicesWhereInput[] {
    return [
      'device_code',
      'serial_number',
      'name',
      'manufacturer',
      'model',
      'firmware_version',
      'hardware_version',
    ].map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    }));
  }
}

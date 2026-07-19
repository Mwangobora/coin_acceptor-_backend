import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { DeviceCommandQueryDto } from '../dto/device-command-query.dto';

@Injectable()
export class CommandQueryBuilder {
  constructor(private readonly scope: StationScopeService) {}

  async where(query: DeviceCommandQueryDto, userId: string) {
    const deviceScope = await this.scope.deviceWhere(
      userId,
      'device_commands.read',
    );
    return {
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.commandType ? { command_type: query.commandType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestedByUserId
        ? { requested_by_user_id: query.requestedByUserId }
        : {}),
      ...(query.requestedFrom || query.requestedTo
        ? this.dateRange(query.requestedFrom, query.requestedTo)
        : {}),
    } satisfies Prisma.device_commandsWhereInput;
  }

  orderBy(
    sortBy = 'requestedAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.device_commandsOrderByWithRelationInput[] {
    const fields = {
      requestedAt: 'requested_at',
      availableAt: 'available_at',
      commandType: 'command_type',
      status: 'status',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'requested_at';
    return [{ [field]: sortOrder }, { id: 'asc' as const }];
  }

  private dateRange(from?: string, to?: string) {
    return {
      requested_at: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }
}

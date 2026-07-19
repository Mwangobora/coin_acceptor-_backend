import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { ChargingPortQueryDto } from '../dto/charging-port-query.dto';

@Injectable()
export class ChargingPortQueryBuilder {
  filterWhere(query: ChargingPortQueryDto): Prisma.charging_portsWhereInput {
    return {
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.lockerId ? { locker_id: query.lockerId } : {}),
      ...(query.portType ? { port_type: query.portType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.powerState ? { power_state: query.powerState } : {}),
    };
  }

  orderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'asc') {
    const fields = {
      portNumber: 'port_number',
      portType: 'port_type',
      status: 'status',
      createdAt: 'created_at',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [
      { [field]: sortOrder },
      { id: 'asc' },
    ] as Prisma.charging_portsOrderByWithRelationInput[];
  }
}

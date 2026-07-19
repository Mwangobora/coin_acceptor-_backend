import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { LockerQueryDto } from '../dto/locker-query.dto';

@Injectable()
export class LockerQueryBuilder {
  filterWhere(query: LockerQueryDto): Prisma.lockersWhereInput {
    return {
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.availabilityStatus
        ? { availability_status: query.availabilityStatus }
        : {}),
      ...(query.doorStatus ? { door_status: query.doorStatus } : {}),
      ...(query.lockStatus ? { lock_status: query.lockStatus } : {}),
      ...(query.sensorStatus ? { sensor_status: query.sensorStatus } : {}),
      ...(query.search ? { OR: this.search(query.search) } : {}),
    };
  }

  orderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'asc') {
    const fields = {
      lockerNumber: 'locker_number',
      availabilityStatus: 'availability_status',
      createdAt: 'created_at',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [
      { [field]: sortOrder },
      { id: 'asc' },
    ] as Prisma.lockersOrderByWithRelationInput[];
  }

  private search(search: string): Prisma.lockersWhereInput[] {
    const number = Number(search);
    return [
      { label: { contains: search, mode: 'insensitive' } },
      ...(Number.isInteger(number) ? [{ locker_number: number }] : []),
      { devices: { device_code: { contains: search, mode: 'insensitive' } } },
      { devices: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
}

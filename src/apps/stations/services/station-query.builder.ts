import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { StationQueryDto } from '../dto/station-query.dto';

@Injectable()
export class StationQueryBuilder {
  filterWhere(query: StationQueryDto): Prisma.stationsWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.stationType ? { station_type: query.stationType } : {}),
      ...(query.region
        ? { region: { equals: query.region, mode: 'insensitive' } }
        : {}),
      ...(query.district
        ? { district: { equals: query.district, mode: 'insensitive' } }
        : {}),
      ...(query.search ? { OR: this.searchFields(query.search) } : {}),
    };
  }

  orderBy(
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Prisma.stationsOrderByWithRelationInput[] {
    const fields = {
      code: 'code',
      name: 'name',
      region: 'region',
      status: 'status',
      createdAt: 'created_at',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [{ [field]: sortOrder }, { id: 'asc' }];
  }

  private searchFields(search: string): Prisma.stationsWhereInput[] {
    return ['code', 'name', 'region', 'district', 'ward', 'address'].map(
      (field) => ({ [field]: { contains: search, mode: 'insensitive' } }),
    );
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import { mapPermission } from '../mappers/access-control.mapper';
import type { PermissionQueryDto } from '../dto/permission-query.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PermissionQueryDto) {
    const where: Prisma.permissionsWhereInput = {
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.permissions.findMany({
        where,
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.permissions.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapPermission),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string) {
    const permission = await this.prisma.permissions.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found.');
    return mapPermission(permission);
  }
}

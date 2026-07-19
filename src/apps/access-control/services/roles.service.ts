import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapPermission, mapRole } from '../mappers/access-control.mapper';
import type {
  CreateRoleDto,
  RoleQueryDto,
  SyncRolePermissionsDto,
  UpdateRoleDto,
  UpdateRoleStatusDto,
} from '../dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  async list(query: RoleQueryDto) {
    const where: Prisma.rolesWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.roles.findMany({
        where,
        orderBy: [{ is_system_role: 'desc' }, { code: 'asc' }],
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.roles.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapRole),
      query.page,
      query.pageSize,
      total,
    );
  }

  async create(
    dto: CreateRoleDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    try {
      const role = await this.prisma.roles.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          is_system_role: false,
          status: 'active',
        },
      });
      await this.audit.record({
        actorUserId: actor.id,
        action: 'roles.created',
        entityType: 'roles',
        entityId: role.id,
        afterData: mapRole(role),
        ...meta,
      });
      return mapRole(role);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Role code already exists.' });
    }
  }

  async get(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found.');
    return mapRole(role);
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.requireRole(id);
    const role = await this.prisma.roles.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'roles.updated',
      entityType: 'roles',
      entityId: role.id,
      beforeData: mapRole(before),
      afterData: mapRole(role),
      ...meta,
    });
    return mapRole(role);
  }

  async updateStatus(
    id: string,
    dto: UpdateRoleStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.requireRole(id);
    if (before.is_system_role && dto.status !== 'active') {
      throw new ForbiddenException('System roles cannot be deactivated.');
    }
    if (dto.status === 'inactive' && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required.');
    }
    const role = await this.prisma.roles.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'roles.status_changed',
      entityType: 'roles',
      entityId: id,
      reason: dto.reason,
      beforeData: mapRole(before),
      afterData: mapRole(role),
      ...meta,
    });
    return mapRole(role);
  }

  async listPermissions(id: string) {
    await this.requireRole(id);
    const mappings = await this.prisma.role_permissions.findMany({
      where: { role_id: id },
      include: { permissions: true },
      orderBy: { permissions: { code: 'asc' } },
    });
    return mappings.map((mapping) => mapPermission(mapping.permissions));
  }

  async syncPermissions(
    id: string,
    dto: SyncRolePermissionsDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const role = await this.requireRole(id);
    const ids = [...new Set(dto.permissionIds)];
    if (ids.length !== dto.permissionIds.length) {
      throw new ConflictException('Duplicate permission IDs are not allowed.');
    }
    const permissions = await this.prisma.permissions.findMany({
      where: { id: { in: ids } },
    });
    if (permissions.length !== ids.length) {
      throw new BadRequestException('Unknown permission ID.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.role_permissions.deleteMany({ where: { role_id: id } });
      if (ids.length) {
        await tx.role_permissions.createMany({
          data: ids.map((permissionId) => ({
            role_id: id,
            permission_id: permissionId,
            granted_by_user_id: actor.id,
          })),
        });
      }
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'roles.permissions_synced',
      entityType: 'roles',
      entityId: id,
      metadata: { roleCode: role.code, permissionCount: ids.length },
      ...meta,
    });
    return this.listPermissions(id);
  }

  private async requireRole(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found.');
    return role;
  }
}

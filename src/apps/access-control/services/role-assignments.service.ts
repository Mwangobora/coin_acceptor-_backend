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
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import {
  CreateRoleAssignmentDto,
  RoleAssignmentQueryDto,
  RevokeRoleAssignmentDto,
} from '../dto/role-assignment.dto';
import { mapRoleAssignment } from '../mappers/access-control.mapper';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
    private readonly audit: AuditLogsService,
  ) {}

  async list(query: RoleAssignmentQueryDto) {
    const where: Prisma.user_role_assignmentsWhereInput = {
      ...(query.userId ? { user_id: query.userId } : {}),
      ...(query.roleId ? { role_id: query.roleId } : {}),
      ...(query.stationId ? { station_id: query.stationId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user_role_assignments.findMany({
        where,
        include: { roles: true },
        orderBy: { assigned_at: 'desc' },
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.user_role_assignments.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapRoleAssignment),
      query.page,
      query.pageSize,
      total,
    );
  }

  listForUser(userId: string, query: RoleAssignmentQueryDto) {
    return this.list({ ...query, userId });
  }

  async create(
    userId: string,
    dto: CreateRoleAssignmentDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future.');
    }
    await this.validateAssignable(userId, dto, actor);
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findEquivalentActiveAssignment(
        tx,
        userId,
        dto,
      );
      if (existing) throw new ConflictException('Active assignment exists.');
      const assignment = await tx.user_role_assignments.create({
        data: {
          user_id: userId,
          role_id: dto.roleId,
          station_id: dto.stationId,
          assigned_by_user_id: actor.id,
          expires_at: expiresAt,
        },
        include: { roles: true },
      });
      await this.audit.record({
        actorUserId: actor.id,
        action: 'role_assignments.created',
        entityType: 'user_role_assignments',
        entityId: assignment.id,
        stationId: dto.stationId,
        afterData: mapRoleAssignment(assignment),
        ...meta,
      });
      return mapRoleAssignment(assignment);
    });
  }

  async revoke(
    userId: string,
    assignmentId: string,
    dto: RevokeRoleAssignmentDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    if (!dto.reason.trim())
      throw new BadRequestException('Reason is required.');
    if (
      await this.permissions.isLastActiveGlobalSuperAdminAssignment(
        assignmentId,
      )
    ) {
      throw new ForbiddenException(
        'Cannot revoke the last global super admin.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user_role_assignments.findFirst({
        where: { id: assignmentId, user_id: userId },
        include: { roles: true },
      });
      if (!before) throw new NotFoundException('Role assignment not found.');
      if (before.revoked_at) return mapRoleAssignment(before);
      const assignment = await tx.user_role_assignments.update({
        where: { id: assignmentId },
        data: {
          revoked_at: new Date(),
          revoked_by_user_id: actor.id,
          revocation_reason: dto.reason,
        },
        include: { roles: true },
      });
      await this.audit.record({
        actorUserId: actor.id,
        action: 'role_assignments.revoked',
        entityType: 'user_role_assignments',
        entityId: assignment.id,
        stationId: assignment.station_id ?? undefined,
        reason: dto.reason,
        beforeData: mapRoleAssignment(before),
        afterData: mapRoleAssignment(assignment),
        ...meta,
      });
      return mapRoleAssignment(assignment);
    });
  }

  private async validateAssignable(
    userId: string,
    dto: CreateRoleAssignmentDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const [user, role, station] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId } }),
      this.prisma.roles.findUnique({ where: { id: dto.roleId } }),
      dto.stationId
        ? this.prisma.stations.findUnique({ where: { id: dto.stationId } })
        : Promise.resolve(null),
    ]);
    if (!user || user.status !== 'active')
      throw new BadRequestException('User is not active.');
    if (!role || role.status !== 'active')
      throw new BadRequestException('Role is not active.');
    if (dto.stationId && (!station || station.status === 'decommissioned')) {
      throw new BadRequestException('Station is not assignable.');
    }
    await this.validateActorScope(actor.id, dto);
    if (
      !(await this.permissions.canGrantRole(
        actor.id,
        dto.roleId,
        dto.stationId,
      ))
    ) {
      throw new ForbiddenException(
        'Cannot grant permissions you do not possess.',
      );
    }
  }

  private async validateActorScope(
    actorUserId: string,
    dto: CreateRoleAssignmentDto,
  ): Promise<void> {
    if (!dto.stationId) {
      if (
        !(await this.permissions.hasPermission(
          actorUserId,
          'roles.manage',
          null,
        ))
      ) {
        throw new ForbiddenException(
          'Global assignment requires global authority.',
        );
      }
      return;
    }
    if (
      !(await this.permissions.hasPermission(
        actorUserId,
        'roles.manage',
        dto.stationId,
      ))
    ) {
      throw new ForbiddenException('Cannot assign outside your station.');
    }
  }

  private findEquivalentActiveAssignment(
    tx: Prisma.TransactionClient,
    userId: string,
    dto: CreateRoleAssignmentDto,
  ) {
    const now = new Date();
    return tx.user_role_assignments.findFirst({
      where: {
        user_id: userId,
        role_id: dto.roleId,
        station_id: dto.stationId ?? null,
        revoked_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
    });
  }
}

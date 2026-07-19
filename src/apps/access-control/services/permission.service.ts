import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    permissionCode: string,
    stationId?: string | null,
  ): Promise<boolean> {
    const count = await this.prisma.user_role_assignments.count({
      where: this.permissionWhere(userId, permissionCode, stationId),
    });
    return count > 0;
  }

  async getPermissionCodes(
    userId: string,
    stationId?: string | null,
  ): Promise<string[]> {
    const mappings = (await this.prisma.role_permissions.findMany({
      where: {
        roles: {
          status: 'active',
          user_role_assignments: {
            some: this.activeAssignmentScope(userId, stationId),
          },
        },
      },
      include: { permissions: true },
    })) as unknown as Array<{ permissions: { code: string } }>;
    return [...new Set(mappings.map((mapping) => mapping.permissions.code))];
  }

  async canGrantRole(
    actorUserId: string,
    roleId: string,
    stationId?: string | null,
  ): Promise<boolean> {
    const rolePermissions = await this.prisma.role_permissions.findMany({
      where: { role_id: roleId },
      include: { permissions: true },
    });
    const actorCodes = await this.getPermissionCodes(actorUserId, stationId);
    return rolePermissions.every((item) =>
      actorCodes.includes(item.permissions.code),
    );
  }

  async isLastActiveGlobalSuperAdminUser(userId: string): Promise<boolean> {
    const targetCount = await this.activeGlobalSuperAdminCount(userId);
    if (targetCount === 0) return false;
    return (await this.activeGlobalSuperAdminCount()) <= targetCount;
  }

  async isLastActiveGlobalSuperAdminAssignment(
    assignmentId: string,
  ): Promise<boolean> {
    const assignment = await this.prisma.user_role_assignments.findUnique({
      where: { id: assignmentId },
      include: {
        roles: true,
        users_user_role_assignments_user_idTousers: true,
      },
    });
    if (!assignment || assignment.roles.code !== 'super_admin') return false;
    if (assignment.station_id || assignment.revoked_at) return false;
    if (
      assignment.users_user_role_assignments_user_idTousers.status !== 'active'
    ) {
      return false;
    }
    return (await this.activeGlobalSuperAdminCount()) <= 1;
  }

  private permissionWhere(
    userId: string,
    permissionCode: string,
    stationId?: string | null,
  ): Prisma.user_role_assignmentsWhereInput {
    return {
      ...this.activeAssignmentScope(userId, stationId),
      roles: {
        status: 'active',
        role_permissions: {
          some: { permissions: { code: permissionCode } },
        },
      },
    };
  }

  private activeAssignmentScope(
    userId: string,
    stationId?: string | null,
  ): Prisma.user_role_assignmentsWhereInput {
    const now = new Date();
    return {
      user_id: userId,
      revoked_at: null,
      users_user_role_assignments_user_idTousers: { status: 'active' },
      roles: { status: 'active' },
      AND: [
        { OR: [{ expires_at: null }, { expires_at: { gt: now } }] },
        stationId
          ? { OR: [{ station_id: null }, { station_id: stationId }] }
          : { station_id: null },
      ],
    };
  }

  private activeGlobalSuperAdminCount(userId?: string): Promise<number> {
    const now = new Date();
    return this.prisma.user_role_assignments.count({
      where: {
        ...(userId ? { user_id: userId } : {}),
        station_id: null,
        revoked_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        roles: { code: 'super_admin', status: 'active' },
        users_user_role_assignments_user_idTousers: { status: 'active' },
      },
    });
  }
}

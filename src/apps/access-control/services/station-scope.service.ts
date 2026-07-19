import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StationScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async stationWhere(
    userId: string,
    permissionCode: string,
  ): Promise<Prisma.stationsWhereInput> {
    const stationIds = await this.authorizedStationIds(userId, permissionCode);
    return stationIds === null ? {} : { id: { in: stationIds } };
  }

  async deviceWhere(
    userId: string,
    permissionCode: string,
  ): Promise<Prisma.devicesWhereInput> {
    const stationIds = await this.authorizedStationIds(userId, permissionCode);
    return stationIds === null ? {} : { station_id: { in: stationIds } };
  }

  async paymentWhere(
    userId: string,
    permissionCode: string,
  ): Promise<Prisma.paymentsWhereInput> {
    const stationIds = await this.authorizedStationIds(userId, permissionCode);
    return stationIds === null ? {} : { station_id: { in: stationIds } };
  }

  async requireGlobal(userId: string, permissionCode: string): Promise<void> {
    const stationIds = await this.authorizedStationIds(userId, permissionCode);
    if (stationIds !== null) {
      throw new ForbiddenException('Global station authority is required.');
    }
  }

  async requireStation(
    userId: string,
    permissionCode: string,
    stationId: string,
  ): Promise<void> {
    const stationIds = await this.authorizedStationIds(userId, permissionCode);
    if (stationIds === null || stationIds.includes(stationId)) return;
    throw new ForbiddenException('Station is outside your scope.');
  }

  private async authorizedStationIds(
    userId: string,
    permissionCode: string,
  ): Promise<string[] | null> {
    const assignments = await this.prisma.user_role_assignments.findMany({
      where: this.assignmentWhere(userId, permissionCode),
      select: { station_id: true },
    });
    if (assignments.some((assignment) => assignment.station_id === null)) {
      return null;
    }
    return [...new Set(assignments.flatMap((item) => item.station_id ?? []))];
  }

  private assignmentWhere(
    userId: string,
    permissionCode: string,
  ): Prisma.user_role_assignmentsWhereInput {
    const now = new Date();
    return {
      user_id: userId,
      revoked_at: null,
      users_user_role_assignments_user_idTousers: { status: 'active' },
      roles: {
        status: 'active',
        role_permissions: {
          some: { permissions: { code: permissionCode } },
        },
      },
      OR: [{ expires_at: null }, { expires_at: { gt: now } }],
    };
  }
}

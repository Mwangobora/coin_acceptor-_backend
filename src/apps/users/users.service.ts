import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PasswordService } from '../auth/services/password.service';
import { AuthSessionService } from '../auth/services/auth-session.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import type { RequestMetadata } from '../auth/types/auth-request.type';
import { PermissionService } from '../access-control/services/permission.service';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../common/utils/pagination.util';
import { mapPrismaError } from '../../common/utils/prisma-error.util';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateUserDto,
  SetTemporaryPasswordDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from './dto/user.dto';
import { mapUser } from './mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: AuthSessionService,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditLogsService,
  ) {}

  async list(query: UserQueryDto) {
    const where: Prisma.usersWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { full_name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.roleId || query.stationId
        ? {
            user_role_assignments_user_role_assignments_user_idTousers: {
              some: {
                ...(query.roleId ? { role_id: query.roleId } : {}),
                ...(query.stationId ? { station_id: query.stationId } : {}),
                revoked_at: null,
              },
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        orderBy: this.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.users.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapUser),
      query.page,
      query.pageSize,
      total,
    );
  }

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    try {
      const user = await this.prisma.users.create({
        data: {
          full_name: dto.fullName,
          email: dto.email.toLowerCase(),
          phone_number: dto.phoneNumber,
          password_hash: await this.passwords.hash(dto.temporaryPassword),
          must_change_password: dto.mustChangePassword ?? true,
          status: 'active',
          created_by_user_id: actor.id,
        },
      });
      await this.audit.record({
        actorUserId: actor.id,
        action: 'users.created',
        entityType: 'users',
        entityId: user.id,
        afterData: mapUser(user),
        ...meta,
      });
      return mapUser(user);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Email already exists.' });
    }
  }

  async get(id: string) {
    return mapUser(await this.requireUser(id));
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.requireUser(id);
    const user = await this.prisma.users.update({
      where: { id },
      data: { full_name: dto.fullName, phone_number: dto.phoneNumber },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'users.updated',
      entityType: 'users',
      entityId: id,
      beforeData: mapUser(before),
      afterData: mapUser(user),
      ...meta,
    });
    return mapUser(user);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.requireUser(id);
    if (id === actor.id && dto.status !== 'active') {
      throw new ForbiddenException('You cannot restrict your own account.');
    }
    if (dto.status !== 'active' && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required.');
    }
    if (
      dto.status !== 'active' &&
      (await this.permissionService.isLastActiveGlobalSuperAdminUser(id))
    ) {
      throw new ForbiddenException(
        'Cannot restrict the last global super admin.',
      );
    }
    const user = await this.prisma.users.update({
      where: { id },
      data: { status: dto.status, locked_until: null },
    });
    if (dto.status !== 'active') {
      await this.sessions.revokeUserSessions(id, `user_${dto.status}`);
    }
    await this.audit.record({
      actorUserId: actor.id,
      action: 'users.status_changed',
      entityType: 'users',
      entityId: id,
      reason: dto.reason,
      beforeData: mapUser(before),
      afterData: mapUser(user),
      ...meta,
    });
    return mapUser(user);
  }

  async setTemporaryPassword(
    id: string,
    dto: SetTemporaryPasswordDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const before = await this.requireUser(id);
    const user = await this.prisma.users.update({
      where: { id },
      data: {
        password_hash: await this.passwords.hash(dto.temporaryPassword),
        must_change_password: true,
      },
    });
    await this.sessions.revokeUserSessions(id, 'temporary_password_set');
    await this.audit.record({
      actorUserId: actor.id,
      action: 'users.temporary_password_set',
      entityType: 'users',
      entityId: id,
      beforeData: mapUser(before),
      afterData: mapUser(user),
      ...meta,
    });
    return { message: 'Temporary password set. User must change password.' };
  }

  private async requireUser(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private orderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'asc') {
    const fields = {
      createdAt: 'created_at',
      fullName: 'full_name',
      email: 'email',
      status: 'status',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [
      { [field]: sortOrder },
      { id: 'asc' },
    ] as Prisma.usersOrderByWithRelationInput[];
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type device_commands } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { PermissionService } from '../../access-control/services/permission.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateDeviceCommandDto } from '../dto/create-device-command.dto';
import type { DeviceCommandQueryDto } from '../dto/device-command-query.dto';
import { mapDeviceCommand } from '../mappers/device-command.mapper';
import { CommandIdempotencyService } from './command-idempotency.service';
import { CommandPayloadValidatorRegistry } from './command-payload-validator-registry';
import { CommandQueryBuilder } from './command-query.builder';
import { CommandRequirementsPolicy } from './command-requirements.policy';
import { CommandTransitionPolicy } from './command-transition.policy';

type RequestMeta = {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class DeviceCommandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly permissions: PermissionService,
    private readonly audit: AuditLogsService,
    private readonly validators: CommandPayloadValidatorRegistry,
    private readonly transitions: CommandTransitionPolicy,
    private readonly idempotency: CommandIdempotencyService,
    private readonly queries: CommandQueryBuilder,
    private readonly requirements: CommandRequirementsPolicy,
  ) {}

  async list(query: DeviceCommandQueryDto, actor: AuthenticatedUser) {
    const where = await this.queries.where(query, actor.id);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.device_commands.findMany({
        where,
        orderBy: this.queries.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.device_commands.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapDeviceCommand),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string, actor: AuthenticatedUser) {
    const command = await this.require(id);
    await this.scope.requireStation(
      actor.id,
      'device_commands.read',
      command.station_id,
    );
    return mapDeviceCommand(command);
  }

  async create(
    deviceId: string,
    dto: CreateDeviceCommandDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ) {
    const requestedAt = new Date();
    const device = await this.requireDevice(deviceId);
    await this.scope.requireStation(
      actor.id,
      'device_commands.create',
      device.station_id,
    );
    await this.requireExtraPermission(
      dto.commandType,
      dto.reason,
      actor,
      device,
    );
    this.requirements.assertTimes(dto, requestedAt);
    await this.validators.validate({
      commandType: dto.commandType,
      deviceId,
      payload: dto.payload,
    });
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const existing = await this.prisma.device_commands.findUnique({
      where: { idempotency_key: idempotencyKey },
    });
    if (existing) return this.idempotent(existing, dto);
    return this.insert(device, dto, actor, meta, requestedAt, idempotencyKey);
  }

  async cancel(
    id: string,
    reason: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ) {
    const command = await this.require(id);
    await this.scope.requireStation(
      actor.id,
      'device_commands.cancel',
      command.station_id,
    );
    this.transitions.assertCanCancel(command.status);
    const updated = await this.prisma.device_commands.update({
      where: { id },
      data: { status: 'cancelled', failure_reason: reason },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: 'device_commands.cancelled',
      entityType: 'device_commands',
      entityId: id,
      stationId: command.station_id,
      reason,
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return mapDeviceCommand(updated);
  }

  private async insert(
    device: { id: string; station_id: string },
    dto: CreateDeviceCommandDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
    requestedAt: Date,
    idempotencyKey: string,
  ) {
    const created = await this.prisma.device_commands.create({
      data: {
        station_id: device.station_id,
        device_id: device.id,
        command_type: dto.commandType,
        payload: dto.payload as Prisma.InputJsonObject,
        idempotency_key: idempotencyKey,
        requested_by_user_id: actor.id,
        requested_at: requestedAt,
        available_at: dto.availableAt ? new Date(dto.availableAt) : requestedAt,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    await this.audit.record({
      actorUserId: actor.id,
      action: `device_commands.${dto.commandType}.requested`,
      entityType: 'device_commands',
      entityId: created.id,
      stationId: device.station_id,
      reason: dto.reason,
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { commandType: dto.commandType },
    });
    if (dto.commandType === 'locker.emergency_open') {
      await this.audit.record({
        actorUserId: actor.id,
        action: 'lockers.emergency_open.commanded',
        entityType: 'device_commands',
        entityId: created.id,
        stationId: device.station_id,
        reason: dto.reason,
        metadata: { deviceId: device.id },
      });
    }
    return mapDeviceCommand(created);
  }

  private idempotent(existing: device_commands, dto: CreateDeviceCommandDto) {
    if (!this.idempotency.matches(existing, dto)) {
      throw new ConflictException(
        'Idempotency key conflicts with another command.',
      );
    }
    return mapDeviceCommand(existing);
  }

  private async require(id: string) {
    const command = await this.prisma.device_commands.findUnique({
      where: { id },
    });
    if (!command) throw new NotFoundException('Device command not found.');
    return command;
  }

  private async requireDevice(id: string) {
    const device = await this.prisma.devices.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found.');
    if (device.lifecycle_status === 'decommissioned') {
      throw new ConflictException('Device is decommissioned.');
    }
    return device;
  }

  private async requireExtraPermission(
    type: string,
    reason: string | undefined,
    actor: AuthenticatedUser,
    device: { station_id: string },
  ) {
    const permission = this.requirements.extraPermission(type);
    if (!permission) return;
    this.requirements.assertReason(type, reason);
    if (
      !(await this.permissions.hasPermission(
        actor.id,
        permission,
        device.station_id,
      ))
    ) {
      throw new ForbiddenException('Missing command-specific permission.');
    }
  }
}

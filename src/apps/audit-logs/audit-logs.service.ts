import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  buildPaginatedResult,
  pageToSkip,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { mapAuditLog } from './mappers/audit-log.mapper';

export type AuditLogInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  stationId?: string;
  beforeData?: Prisma.InputJsonObject;
  afterData?: Prisma.InputJsonObject;
  metadata?: Prisma.InputJsonObject;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQueryDto) {
    const where: Prisma.audit_logsWhereInput = {
      ...(query.actorUserId ? { actor_user_id: query.actorUserId } : {}),
      ...(query.stationId ? { station_id: query.stationId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entity_type: query.entityType } : {}),
      ...(query.entityId ? { entity_id: query.entityId } : {}),
      ...(query.occurredFrom || query.occurredTo
        ? {
            occurred_at: {
              ...(query.occurredFrom
                ? { gte: new Date(query.occurredFrom) }
                : {}),
              ...(query.occurredTo ? { lte: new Date(query.occurredTo) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.audit_logs.findMany({
        where,
        orderBy: { occurred_at: query.sortOrder },
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map(mapAuditLog),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(id: string) {
    const log = await this.prisma.audit_logs.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Audit log not found.');
    return mapAuditLog(log);
  }

  async record(input: AuditLogInput): Promise<void> {
    await this.prisma.audit_logs.create({
      data: {
        actor_type: input.actorUserId ? 'user' : 'system',
        actor_user_id: input.actorUserId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        request_id: input.requestId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        reason: input.reason,
        station_id: input.stationId,
        before_data: input.beforeData,
        after_data: input.afterData,
        metadata: input.metadata ?? {},
      },
    });
  }
}

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

export type AuditLogInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

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
        metadata: input.metadata ?? {},
      },
    });
  }
}

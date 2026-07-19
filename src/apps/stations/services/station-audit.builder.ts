import { Injectable } from '@nestjs/common';
import type { stations } from '@prisma/client';

import type { AuditLogInput } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapStation } from '../mappers/station.mapper';

@Injectable()
export class StationAuditBuilder {
  build(input: {
    action: string;
    actorUserId: string;
    after: stations;
    meta: RequestMetadata;
    before?: stations;
    reason?: string;
  }): AuditLogInput {
    return {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'stations',
      entityId: input.after.id,
      stationId: input.after.id,
      reason: input.reason,
      beforeData: input.before ? mapStation(input.before) : undefined,
      afterData: mapStation(input.after),
      ...input.meta,
    };
  }
}

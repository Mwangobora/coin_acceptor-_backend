import { Injectable } from '@nestjs/common';
import type { lockers } from '@prisma/client';

import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapLocker } from '../mappers/locker.mapper';

@Injectable()
export class LockerAuditBuilder {
  build(input: {
    action: string;
    after: lockers;
    stationId: string;
    actorUserId: string;
    meta: RequestMetadata;
    before?: lockers;
    reason?: string;
  }) {
    return {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'lockers',
      entityId: input.after.id,
      stationId: input.stationId,
      reason: input.reason,
      beforeData: input.before ? mapLocker(input.before) : undefined,
      afterData: mapLocker(input.after),
      ...input.meta,
    };
  }
}

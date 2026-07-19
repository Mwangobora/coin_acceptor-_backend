import { Injectable } from '@nestjs/common';
import { Prisma, type devices } from '@prisma/client';

import type { AuditLogInput } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapDevice } from '../mappers/device.mapper';

@Injectable()
export class DeviceAuditBuilder {
  build(input: {
    action: string;
    actorUserId: string;
    after: devices;
    meta: RequestMetadata;
    before?: devices;
    reason?: string;
  }): AuditLogInput {
    return {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'devices',
      entityId: input.after.id,
      stationId: input.after.station_id,
      reason: input.reason,
      beforeData: input.before
        ? (mapDevice(input.before) as unknown as Prisma.InputJsonObject)
        : undefined,
      afterData: mapDevice(input.after) as unknown as Prisma.InputJsonObject,
      ...input.meta,
    };
  }
}

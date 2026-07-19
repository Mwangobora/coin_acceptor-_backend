import { Injectable } from '@nestjs/common';
import type { charging_ports } from '@prisma/client';

import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapChargingPort } from '../mappers/charging-port.mapper';

@Injectable()
export class ChargingPortAuditBuilder {
  build(input: {
    action: string;
    after: charging_ports;
    stationId: string;
    actorUserId: string;
    meta: RequestMetadata;
    before?: charging_ports;
    reason?: string;
  }) {
    return {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'charging_ports',
      entityId: input.after.id,
      stationId: input.stationId,
      reason: input.reason,
      beforeData: input.before ? mapChargingPort(input.before) : undefined,
      afterData: mapChargingPort(input.after),
      ...input.meta,
    };
  }
}

import { Injectable } from '@nestjs/common';
import type { device_credentials } from '@prisma/client';

import type { RequestMetadata } from '../../auth/types/auth-request.type';
import { mapCredential } from '../mappers/credential.mapper';

@Injectable()
export class CredentialAuditBuilder {
  build(input: {
    action: string;
    after: device_credentials;
    stationId: string;
    actorUserId: string;
    meta: RequestMetadata;
    before?: device_credentials;
  }) {
    return {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: 'device_credentials',
      entityId: input.after.id,
      stationId: input.stationId,
      beforeData: input.before ? mapCredential(input.before) : undefined,
      afterData: mapCredential(input.after),
      ...input.meta,
    };
  }
}

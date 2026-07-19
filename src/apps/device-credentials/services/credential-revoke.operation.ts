import { Injectable } from '@nestjs/common';
import type { device_credentials } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { RevokeCredentialDto } from '../dto/revoke-credential.dto';
import { mapCredential } from '../mappers/credential.mapper';
import { CredentialAuditBuilder } from './credential-audit.builder';

@Injectable()
export class CredentialRevokeOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly audits: CredentialAuditBuilder,
  ) {}

  async execute(
    before: device_credentials & { devices: { station_id: string } },
    dto: RevokeCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const credential = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.device_credentials.update({
        where: { id: before.id },
        data: {
          status: 'revoked',
          revoked_at: new Date(),
          revoked_by_user_id: actor.id,
          revoke_reason: dto.reason,
        },
      });
      await this.audit.record(
        this.audits.build({
          action: 'device_credentials.revoked',
          after: revoked,
          stationId: before.devices.station_id,
          actorUserId: actor.id,
          meta,
          before,
        }),
        tx,
      );
      return revoked;
    });
    return mapCredential(credential);
  }
}

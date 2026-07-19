import { Injectable } from '@nestjs/common';
import type { device_credentials } from '@prisma/client';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { PrismaService } from '../../../database/prisma.service';
import type { RotateCredentialDto } from '../dto/rotate-credential.dto';
import { mapCredential } from '../mappers/credential.mapper';
import { CredentialAuditBuilder } from './credential-audit.builder';
import { CredentialMaterialService } from './credential-material.service';

@Injectable()
export class CredentialRotateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly materials: CredentialMaterialService,
    private readonly audits: CredentialAuditBuilder,
  ) {}

  async execute(
    before: device_credentials & { devices: { station_id: string } },
    dto: RotateCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    const material = await this.materials.material(before.credential_type, dto);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.device_credentials.create({
        data: this.materials.data({
          deviceId: before.device_id,
          dto: { ...dto, credentialType: before.credential_type },
          actorId: actor.id,
          material,
          rotatedFromCredentialId: before.id,
        }),
      });
      const revoked = await tx.device_credentials.update({
        where: { id: before.id },
        data: {
          status: 'revoked',
          revoked_at: new Date(),
          revoked_by_user_id: actor.id,
          revoke_reason: dto.reason ?? 'rotated',
        },
      });
      await this.audit.record(
        this.audits.build({
          action: 'device_credentials.rotated',
          after: created,
          stationId: before.devices.station_id,
          actorUserId: actor.id,
          meta,
          before: revoked,
        }),
        tx,
      );
      return mapCredential(created, material.response);
    });
  }
}

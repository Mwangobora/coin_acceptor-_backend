import { Injectable } from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateCredentialDto } from '../dto/create-credential.dto';
import { mapCredential } from '../mappers/credential.mapper';
import { CredentialAuditBuilder } from './credential-audit.builder';
import { CredentialMaterialService } from './credential-material.service';
import { CredentialRecordService } from './credential-record.service';

@Injectable()
export class CredentialCreateOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly records: CredentialRecordService,
    private readonly materials: CredentialMaterialService,
    private readonly audits: CredentialAuditBuilder,
  ) {}

  async execute(
    deviceId: string,
    dto: CreateCredentialDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    try {
      const device = await this.records.requireDevice(deviceId);
      const material = await this.materials.material(dto.credentialType, dto);
      const credential = await this.prisma.$transaction(async (tx) => {
        const created = await tx.device_credentials.create({
          data: this.materials.data({
            deviceId,
            dto,
            actorId: actor.id,
            material,
          }),
        });
        await this.audit.record(
          this.audits.build({
            action: 'device_credentials.created',
            after: created,
            stationId: device.station_id,
            actorUserId: actor.id,
            meta,
          }),
          tx,
        );
        return created;
      });
      return mapCredential(credential, material.response);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Credential key already exists.' });
    }
  }
}

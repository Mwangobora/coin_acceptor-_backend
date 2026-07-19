import { Module } from '@nestjs/common';

import { AccessControlModule } from '../access-control/access-control.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PrismaModule } from '../../database/prisma.module';
import { DeviceCredentialsController } from './device-credentials.controller';
import { CertificateValidationService } from './services/certificate-validation.service';
import { CredentialAuditBuilder } from './services/credential-audit.builder';
import { CredentialCreateOperation } from './services/credential-create.operation';
import { CredentialMaterialService } from './services/credential-material.service';
import { CredentialQueryBuilder } from './services/credential-query.builder';
import { CredentialReadOperation } from './services/credential-read.operation';
import { CredentialRecordService } from './services/credential-record.service';
import { CredentialRevokeOperation } from './services/credential-revoke.operation';
import { CredentialRotateOperation } from './services/credential-rotate.operation';
import { CredentialRotationPolicy } from './services/credential-rotation.policy';
import { DeviceCredentialService } from './services/device-credential.service';
import { DeviceSecretEncryptionService } from './services/device-secret-encryption.service';
import { DeviceSecretGenerator } from './services/device-secret-generator.service';
import { DeviceSecretHasher } from './services/device-secret-hasher.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuditLogsModule],
  controllers: [DeviceCredentialsController],
  providers: [
    DeviceCredentialService,
    CredentialCreateOperation,
    CredentialRotateOperation,
    CredentialRevokeOperation,
    CredentialReadOperation,
    CredentialRecordService,
    CredentialMaterialService,
    CredentialAuditBuilder,
    CredentialQueryBuilder,
    DeviceSecretGenerator,
    DeviceSecretHasher,
    DeviceSecretEncryptionService,
    CertificateValidationService,
    CredentialRotationPolicy,
  ],
})
export class DeviceCredentialsModule {}

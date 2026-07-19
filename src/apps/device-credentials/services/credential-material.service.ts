import { Injectable } from '@nestjs/common';

import type { CreateCredentialDto } from '../dto/create-credential.dto';
import type { RotateCredentialDto } from '../dto/rotate-credential.dto';
import { CertificateValidationService } from './certificate-validation.service';
import { CredentialRotationPolicy } from './credential-rotation.policy';
import { DeviceSecretEncryptionService } from './device-secret-encryption.service';
import { DeviceSecretGenerator } from './device-secret-generator.service';
import { DeviceSecretHasher } from './device-secret-hasher.service';

@Injectable()
export class CredentialMaterialService {
  constructor(
    private readonly generator: DeviceSecretGenerator,
    private readonly hasher: DeviceSecretHasher,
    private readonly encryption: DeviceSecretEncryptionService,
    private readonly certificates: CertificateValidationService,
    private readonly policy: CredentialRotationPolicy,
  ) {}

  async material(type: string, dto: CreateCredentialDto | RotateCredentialDto) {
    if (type === 'api_key') {
      const apiKey = this.generator.apiKey();
      return {
        secret_hash: await this.hasher.hash(apiKey),
        secret_encrypted: null,
        response: { apiKey },
      };
    }
    if (type === 'hmac') {
      const hmacSecret = this.generator.hmacSecret();
      return {
        secret_hash: null,
        secret_encrypted: this.encryption.encrypt(hmacSecret),
        response: { hmacSecret },
      };
    }
    return {
      ...this.certificates.validate(dto),
      secret_hash: null,
      secret_encrypted: null,
      response: {},
    };
  }

  data(input: {
    deviceId: string;
    dto:
      CreateCredentialDto | (RotateCredentialDto & { credentialType: string });
    actorId: string;
    material: Record<string, unknown>;
    rotatedFromCredentialId?: string;
  }) {
    return {
      device_id: input.deviceId,
      key_id: this.generator.keyId(input.dto.credentialType),
      credential_type: input.dto.credentialType,
      expires_at: this.policy.validateExpiry(input.dto.expiresAt),
      created_by_user_id: input.actorId,
      rotated_from_credential_id: input.rotatedFromCredentialId,
      secret_hash: input.material.secret_hash as string | null,
      secret_encrypted: input.material.secret_encrypted as string | null,
      public_key_pem: input.material.publicKeyPem as string | undefined,
      certificate_fingerprint: input.material.certificateFingerprint as
        string | undefined,
    };
  }
}

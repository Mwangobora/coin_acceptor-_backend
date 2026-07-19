import type { device_credentials } from '@prisma/client';

import type { CredentialResponse } from '../types/credential-response.type';

export function mapCredential(
  credential: device_credentials,
  options: {
    includePublicKey?: boolean;
    apiKey?: string;
    hmacSecret?: string;
  } = {},
): CredentialResponse {
  return {
    id: credential.id,
    deviceId: credential.device_id,
    keyId: credential.key_id,
    credentialType: credential.credential_type,
    status: credential.status,
    validFrom: credential.valid_from.toISOString(),
    expiresAt: credential.expires_at?.toISOString() ?? null,
    lastUsedAt: credential.last_used_at?.toISOString() ?? null,
    revokedAt: credential.revoked_at?.toISOString() ?? null,
    revokeReason: credential.revoke_reason,
    rotatedFromCredentialId: credential.rotated_from_credential_id,
    certificateFingerprint: credential.certificate_fingerprint,
    ...(options.includePublicKey
      ? { publicKeyPem: credential.public_key_pem }
      : {}),
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.hmacSecret ? { hmacSecret: options.hmacSecret } : {}),
    createdAt: credential.created_at.toISOString(),
  };
}

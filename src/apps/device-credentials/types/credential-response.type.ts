export type CredentialResponse = {
  id: string;
  deviceId: string;
  keyId: string;
  credentialType: string;
  status: string;
  validFrom: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  rotatedFromCredentialId: string | null;
  certificateFingerprint: string | null;
  publicKeyPem?: string | null;
  createdAt: string;
  apiKey?: string;
  hmacSecret?: string;
};

import type { device_credentials } from '@prisma/client';

import { mapCredential } from './credential.mapper';

describe('mapCredential', () => {
  it('omits stored secret material and can include one-time plaintext', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const credential: device_credentials = {
      id: 'credential-1',
      device_id: 'device-1',
      key_id: 'cred_api_key_1',
      credential_type: 'api_key',
      secret_hash: 'hash',
      secret_encrypted: null,
      public_key_pem: null,
      certificate_fingerprint: null,
      status: 'active',
      valid_from: now,
      expires_at: null,
      last_used_at: null,
      revoked_at: null,
      revoke_reason: null,
      rotated_from_credential_id: null,
      created_at: now,
      created_by_user_id: null,
      revoked_by_user_id: null,
    };

    const response = mapCredential(credential, { apiKey: 'plain-once' });

    expect(JSON.stringify(response)).not.toContain('secret_hash');
    expect(response.apiKey).toBe('plain-once');
  });
});

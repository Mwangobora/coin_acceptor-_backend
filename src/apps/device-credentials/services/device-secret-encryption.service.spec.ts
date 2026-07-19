import { ConfigService } from '@nestjs/config';

import { DeviceSecretEncryptionService } from './device-secret-encryption.service';

describe('DeviceSecretEncryptionService', () => {
  it('encrypts HMAC material in a versioned envelope', () => {
    const service = new DeviceSecretEncryptionService({
      getOrThrow: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef'),
    } as unknown as ConfigService);

    const encrypted = service.encrypt('plain-secret');

    expect(encrypted).toMatch(/^v1:/);
    expect(encrypted).not.toContain('plain-secret');
  });
});

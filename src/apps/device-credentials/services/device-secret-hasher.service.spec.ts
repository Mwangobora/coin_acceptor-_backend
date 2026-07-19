import { DeviceSecretHasher } from './device-secret-hasher.service';

describe('DeviceSecretHasher', () => {
  it('hashes without returning plaintext', async () => {
    const hash = await new DeviceSecretHasher().hash('plain-secret');
    expect(hash).not.toBe('plain-secret');
    expect(hash).toContain('argon2');
  });
});

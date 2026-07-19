import { DeviceSecretGenerator } from './device-secret-generator.service';

describe('DeviceSecretGenerator', () => {
  const generator = new DeviceSecretGenerator();

  it('generates readable key ids and one-time secrets', () => {
    expect(generator.keyId('api_key')).toMatch(/^cred_api_key_/);
    expect(generator.apiKey()).toMatch(/^cak_/);
    expect(generator.hmacSecret().length).toBeGreaterThan(20);
  });
});

import * as argon2 from 'argon2';

import { DeviceApiKeyService } from './device-api-key.service';

describe('DeviceApiKeyService', () => {
  it('authenticates active API key credentials', async () => {
    const hash = String(await argon2.hash('secret'));
    const prisma = {
      device_credentials: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'credential-1',
          device_id: 'device-1',
          key_id: 'key-1',
          secret_hash: hash,
          devices: { station_id: 'station-1' },
        }),
        update: jest.fn(),
      },
    };

    await expect(
      new DeviceApiKeyService(prisma as never).authenticate(
        'DeviceApiKey key-1.secret',
      ),
    ).resolves.toMatchObject({
      deviceId: 'device-1',
      stationId: 'station-1',
      credentialType: 'api_key',
    });
  });
});

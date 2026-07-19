import { UnauthorizedException } from '@nestjs/common';

import { DeviceAuthService } from './device-auth.service';

describe('DeviceAuthService', () => {
  const apiKeys = { authenticate: jest.fn() };
  const hmac = { authenticate: jest.fn() };
  const service = new DeviceAuthService(apiKeys as never, hmac as never);

  beforeEach(() => jest.clearAllMocks());

  it('routes API key and HMAC requests', async () => {
    const apiRequest = {
      header: (name: string) =>
        name === 'authorization' ? 'DeviceApiKey key.secret' : undefined,
    };
    await service.authenticate(apiRequest as never);
    expect(apiKeys.authenticate).toHaveBeenCalledWith(
      'DeviceApiKey key.secret',
    );

    const hmacRequest = {
      header: (name: string) =>
        name === 'x-device-key-id' ? 'key' : undefined,
    };
    await service.authenticate(hmacRequest as never);
    expect(hmac.authenticate).toHaveBeenCalledWith(hmacRequest);
  });

  it('rejects requests without device credentials', () => {
    expect(() =>
      service.authenticate({ header: () => undefined } as never),
    ).toThrow(UnauthorizedException);
  });
});

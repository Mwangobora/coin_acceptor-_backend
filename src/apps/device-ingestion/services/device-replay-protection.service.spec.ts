const redisInstance = {
  status: 'wait',
  connect: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => redisInstance));

import { DeviceReplayProtectionService } from './device-replay-protection.service';

describe('DeviceReplayProtectionService', () => {
  it('reserves nonces with Redis SET NX and expiration', async () => {
    const service = new DeviceReplayProtectionService({
      getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
    } as never);

    await expect(
      service.reserveNonce('credential-1', 'nonce-1', 300),
    ).resolves.toBe(true);
    expect(redisInstance.connect).toHaveBeenCalled();
    expect(redisInstance.set).toHaveBeenCalledWith(
      'device-auth:nonce:credential-1:nonce-1',
      '1',
      'EX',
      300,
      'NX',
    );
    service.onModuleDestroy();
    expect(redisInstance.disconnect).toHaveBeenCalled();
  });
});

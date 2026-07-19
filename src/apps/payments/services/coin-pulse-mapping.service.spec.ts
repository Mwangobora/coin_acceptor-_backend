import { BadRequestException } from '@nestjs/common';

import { CoinPulseMappingService } from './coin-pulse-mapping.service';

describe('CoinPulseMappingService', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('{"1":100,"5":500}'),
  };
  const prisma = { system_settings: { findMany: jest.fn() } };
  const service = new CoinPulseMappingService(prisma as never, config as never);

  beforeEach(() => {
    prisma.system_settings.findMany.mockReset();
  });

  it('uses scoped settings in device, station, global priority order', async () => {
    prisma.system_settings.findMany.mockResolvedValue([
      { scope_type: 'global', value_json: { '5': 100 } },
      { scope_type: 'station', value_json: { '5': 300 } },
      { scope_type: 'device', value_json: { '5': 500 } },
    ]);
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 5,
      }),
    ).resolves.toBe(500n);
  });

  it('falls back to env config and rejects invalid mappings', async () => {
    prisma.system_settings.findMany.mockResolvedValue([]);
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 1,
      }),
    ).resolves.toBe(100n);
    prisma.system_settings.findMany.mockResolvedValue([
      { scope_type: 'global', value_json: { zero: 0 } },
    ]);
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

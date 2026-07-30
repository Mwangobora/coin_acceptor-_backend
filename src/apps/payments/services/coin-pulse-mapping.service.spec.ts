import { BadRequestException } from '@nestjs/common';

import { CoinPulseMappingService } from './coin-pulse-mapping.service';

describe('CoinPulseMappingService', () => {
  const settings = { resolveActiveJsonSetting: jest.fn() };
  const validator = {
    resolve: jest.fn(),
  };
  const service = new CoinPulseMappingService(
    settings as never,
    validator as never,
  );

  beforeEach(() => {
    settings.resolveActiveJsonSetting.mockReset();
    validator.resolve.mockReset();
  });

  it('uses scoped settings in device, station, global priority order', async () => {
    settings.resolveActiveJsonSetting.mockResolvedValue({
      scope_type: 'device',
      value_json: { currency: 'TZS', settleWindowMs: 500, entries: [] },
    });
    validator.resolve.mockReturnValue({
      pulseCount: 16,
      amountMinor: 500,
      durationSeconds: 120,
      currency: 'TZS',
      settleWindowMs: 500,
    });
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 16,
      }),
    ).resolves.toBe(500n);
  });

  it('rejects missing settings and invalid mappings', async () => {
    settings.resolveActiveJsonSetting.mockResolvedValue(null);
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 4,
      }),
    ).rejects.toThrow(BadRequestException);
    settings.resolveActiveJsonSetting.mockResolvedValue({
      scope_type: 'global',
      value_json: {},
    });
    validator.resolve.mockImplementation(() => {
      throw new BadRequestException('bad mapping');
    });
    await expect(
      service.denominationFor({
        stationId: 'station-1',
        deviceId: 'device-1',
        pulseCount: 4,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

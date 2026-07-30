import { SystemSettingResolutionService } from './system-setting-resolution.service';

describe('SystemSettingResolutionService', () => {
  it('prefers device scope over station and global settings', async () => {
    const prisma = {
      system_settings: {
        findMany: jest.fn().mockResolvedValue([
          { scope_type: 'global', value_json: { global: true } },
          { scope_type: 'station', value_json: { station: true } },
          { scope_type: 'device', value_json: { device: true } },
        ]),
      },
    };
    const service = new SystemSettingResolutionService(prisma as never);
    await expect(
      service.resolveActiveJsonSetting('coin.pulse_mapping', {
        stationId: 'station-1',
        deviceId: 'device-1',
      }),
    ).resolves.toMatchObject({
      scope_type: 'device',
      value_json: { device: true },
    });
  });
});

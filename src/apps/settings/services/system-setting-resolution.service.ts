import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SystemSettingResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActiveJsonSetting(settingKey: string, input: SettingScopeInput) {
    const settings = await this.prisma.system_settings.findMany({
      where: {
        setting_key: settingKey,
        status: 'active',
        OR: [
          {
            scope_type: 'device',
            device_id: input.deviceId,
            station_id: input.stationId,
          },
          { scope_type: 'station', station_id: input.stationId },
          { scope_type: 'global' },
        ],
      },
      orderBy: [{ scope_type: 'asc' }, { updated_at: 'desc' }],
    });
    return (
      settings.find((item) => item.scope_type === 'device') ??
      settings.find((item) => item.scope_type === 'station') ??
      settings.find((item) => item.scope_type === 'global') ??
      null
    );
  }
}

type SettingScopeInput = {
  stationId: string;
  deviceId: string;
};

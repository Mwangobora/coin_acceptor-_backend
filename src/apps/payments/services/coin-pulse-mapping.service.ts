import { BadRequestException, Injectable } from '@nestjs/common';

import { COIN_PULSE_MAPPING_SETTING_KEY } from '../../settings/constants/hardware-settings.constants';
import { SystemSettingResolutionService } from '../../settings/services/system-setting-resolution.service';
import { CoinPulseMappingValidator } from '../../settings/services/coin-pulse-mapping.validator';
import type { CoinPulseResolution } from '../../settings/types/hardware-settings.types';

@Injectable()
export class CoinPulseMappingService {
  constructor(
    private readonly settings: SystemSettingResolutionService,
    private readonly validator: CoinPulseMappingValidator,
  ) {}

  async denominationFor(input: {
    stationId: string;
    deviceId: string;
    pulseCount: number;
  }): Promise<bigint | null> {
    const entry = await this.entryFor(input);
    return entry ? BigInt(entry.amountMinor) : null;
  }

  async entryFor(input: {
    stationId: string;
    deviceId: string;
    pulseCount: number;
  }): Promise<CoinPulseResolution | null> {
    const setting = await this.settings.resolveActiveJsonSetting(
      COIN_PULSE_MAPPING_SETTING_KEY,
      input,
    );
    if (!setting) {
      throw new BadRequestException(
        'No active coin pulse mapping is configured.',
      );
    }
    return this.validator.resolve(setting.value_json, input.pulseCount);
  }
}

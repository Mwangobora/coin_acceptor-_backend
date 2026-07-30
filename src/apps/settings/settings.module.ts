import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';
import { CoinPulseMappingValidator } from './services/coin-pulse-mapping.validator';
import { HardwareCapabilitiesMapper } from './services/hardware-capabilities.mapper';
import { HardwarePrototypePinMapValidator } from './services/hardware-prototype-pin-map.validator';
import { SystemSettingResolutionService } from './services/system-setting-resolution.service';

@Module({
  imports: [PrismaModule],
  providers: [
    CoinPulseMappingValidator,
    HardwareCapabilitiesMapper,
    HardwarePrototypePinMapValidator,
    SystemSettingResolutionService,
  ],
  exports: [
    CoinPulseMappingValidator,
    HardwareCapabilitiesMapper,
    HardwarePrototypePinMapValidator,
    SystemSettingResolutionService,
  ],
})
export class SettingsModule {}

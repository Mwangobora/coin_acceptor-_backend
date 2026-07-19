import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { DeviceIngestionModule } from './modules/device-ingestion/device-ingestion.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [ConfigModule, HealthModule, DeviceIngestionModule],
})
export class AppModule {}

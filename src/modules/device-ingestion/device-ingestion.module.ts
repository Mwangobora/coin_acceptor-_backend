import { Module } from '@nestjs/common';

import { DeviceIngestionService } from './device-ingestion.service';

@Module({
  providers: [DeviceIngestionService],
})
export class DeviceIngestionModule {}

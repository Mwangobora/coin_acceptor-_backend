import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceIngestionService {
  getBoundarySummary(): string {
    return 'Device ingestion receives device communication and routes it later.';
  }
}

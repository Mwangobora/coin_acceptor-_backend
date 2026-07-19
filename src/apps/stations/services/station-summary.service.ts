import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StationSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async forStation(stationId: string) {
    const [totalDevices, activeDevices, offlineDevices] = await Promise.all([
      this.prisma.devices.count({ where: { station_id: stationId } }),
      this.prisma.devices.count({
        where: { station_id: stationId, lifecycle_status: 'active' },
      }),
      this.prisma.devices.count({
        where: { station_id: stationId, connectivity_status: 'offline' },
      }),
    ]);
    return { totalDevices, activeDevices, offlineDevices };
  }
}

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DeviceSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async activeSessionCount(deviceId: string): Promise<number> {
    return this.prisma.charging_sessions.count({
      where: {
        device_id: deviceId,
        status: { in: ['pending', 'awaiting_device', 'active', 'paused'] },
      },
    });
  }

  async forDevice(deviceId: string) {
    const [totalLockers, availableLockers, totalPorts, activeSessions] =
      await Promise.all([
        this.prisma.lockers.count({ where: { device_id: deviceId } }),
        this.prisma.lockers.count({
          where: { device_id: deviceId, availability_status: 'available' },
        }),
        this.prisma.charging_ports.count({ where: { device_id: deviceId } }),
        this.activeSessionCount(deviceId),
      ]);
    return { totalLockers, availableLockers, totalPorts, activeSessions };
  }
}

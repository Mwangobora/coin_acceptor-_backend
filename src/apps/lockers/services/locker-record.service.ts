import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class LockerRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async requireDevice(id: string) {
    const device = await this.prisma.devices.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found.');
    return device;
  }

  async requireLocker(id: string) {
    const locker = await this.prisma.lockers.findUnique({
      where: { id },
      include: { devices: true },
    });
    if (!locker) throw new NotFoundException('Locker not found.');
    return locker;
  }

  activeSessionCount(lockerId: string) {
    return this.prisma.charging_sessions.count({
      where: {
        locker_id: lockerId,
        status: { in: ['pending', 'awaiting_device', 'active', 'paused'] },
      },
    });
  }

  async summary(lockerId: string) {
    const [totalPorts, availablePorts, activeSessions] = await Promise.all([
      this.prisma.charging_ports.count({ where: { locker_id: lockerId } }),
      this.prisma.charging_ports.count({
        where: { locker_id: lockerId, status: 'available' },
      }),
      this.activeSessionCount(lockerId),
    ]);
    return { totalPorts, availablePorts, hasActiveSession: activeSessions > 0 };
  }
}

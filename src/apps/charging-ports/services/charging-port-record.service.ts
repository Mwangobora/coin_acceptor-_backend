import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChargingPortRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async requireLocker(id: string) {
    const locker = await this.prisma.lockers.findUnique({
      where: { id },
      include: { devices: true },
    });
    if (!locker) throw new NotFoundException('Locker not found.');
    return locker;
  }

  async requirePort(id: string) {
    const port = await this.prisma.charging_ports.findUnique({
      where: { id },
      include: { devices: true, lockers: true },
    });
    if (!port) throw new NotFoundException('Charging port not found.');
    return port;
  }

  activeSessionCount(portId: string) {
    return this.prisma.charging_sessions.count({
      where: {
        charging_port_id: portId,
        status: { in: ['pending', 'awaiting_device', 'active', 'paused'] },
      },
    });
  }

  async ensureHardwareChannelUnique(
    deviceId: string,
    channel?: string,
    id?: string,
  ) {
    if (!channel) return;
    const existing = await this.prisma.charging_ports.findFirst({
      where: {
        device_id: deviceId,
        hardware_channel: channel,
        ...(id ? { id: { not: id } } : {}),
      },
    });
    if (existing) throw new Error('duplicate_hardware_channel');
  }
}

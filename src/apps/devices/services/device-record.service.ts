import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type DeviceRecordClient = Pick<
  Prisma.TransactionClient,
  'devices' | 'charging_sessions'
>;

@Injectable()
export class DeviceRecordService {
  async require(id: string, client: DeviceRecordClient) {
    const device = await client.devices.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found.');
    return device;
  }

  activeSessionCount(deviceId: string, client: DeviceRecordClient) {
    return client.charging_sessions.count({
      where: {
        device_id: deviceId,
        status: { in: ['pending', 'awaiting_device', 'active', 'paused'] },
      },
    });
  }
}

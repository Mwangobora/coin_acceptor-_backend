import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  OPERATIONAL_STATUSES,
  POWER_SOURCES,
} from '../constants/device-event.constants';
import type {
  DeviceEventContext,
  DeviceEventHandler,
} from '../types/device-event-handler.type';
import { assertIn, stringValue } from './handler-utils';

@Injectable()
export class HeartbeatEventHandler implements DeviceEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  canHandle(category: string, eventType: string): boolean {
    return category === 'heartbeat' && eventType === 'device.heartbeat';
  }

  async handle(context: DeviceEventContext): Promise<void> {
    const operationalStatus = stringValue(context.payload, 'operationalStatus');
    const powerSource = stringValue(context.payload, 'powerSource');
    assertIn(operationalStatus, OPERATIONAL_STATUSES);
    assertIn(powerSource, POWER_SOURCES);
    const device = await this.prisma.devices.findUniqueOrThrow({
      where: { id: context.event.device_id },
      select: { lifecycle_status: true },
    });
    await this.prisma.devices.update({
      where: { id: context.event.device_id },
      data: {
        last_seen_at: context.receiptTime,
        last_ip_address: context.sourceIp,
        firmware_version: context.event.firmware_version ?? undefined,
        ...(device.lifecycle_status === 'decommissioned'
          ? {}
          : {
              connectivity_status: 'online',
              operational_status: operationalStatus,
              current_power_source: powerSource,
            }),
      },
    });
  }
}

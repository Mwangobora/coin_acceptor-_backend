import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { POWER_SOURCES } from '../constants/device-event.constants';
import type {
  DeviceEventContext,
  DeviceEventHandler,
} from '../types/device-event-handler.type';
import {
  assertIn,
  numberValue,
  requireOne,
  stringValue,
} from './handler-utils';

const PORT_EVENTS = new Set([
  'port.status',
  'port.power_on',
  'port.power_off',
  'port.fault',
]);

@Injectable()
export class ChargingPortEventHandler implements DeviceEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  canHandle(category: string, eventType: string): boolean {
    return (
      (category === 'power' && eventType === 'power.source_changed') ||
      (category === 'power' && PORT_EVENTS.has(eventType))
    );
  }

  async handle(context: DeviceEventContext): Promise<void> {
    if (context.event.event_type === 'power.source_changed') {
      await this.updatePowerSource(context);
      return;
    }
    const port = await this.findPort(context);
    const data = await this.portData(context, port.id);
    await this.prisma.charging_ports.update({
      where: { id: port.id },
      data,
    });
  }

  private async updatePowerSource(context: DeviceEventContext): Promise<void> {
    const powerSource = stringValue(context.payload, 'powerSource');
    assertIn(powerSource, POWER_SOURCES);
    await this.prisma.devices.update({
      where: { id: context.event.device_id },
      data: {
        current_power_source: powerSource,
        operational_status: stringValue(context.payload, 'operationalStatus'),
      },
    });
  }

  private findPort(context: DeviceEventContext) {
    const portId = stringValue(context.payload, 'portId');
    const portNumber = numberValue(context.payload, 'portNumber');
    const channel = stringValue(context.payload, 'hardwareChannel');
    requireOne(portId ?? portNumber ?? channel, 'Port identity is required.');
    return this.prisma.charging_ports.findFirstOrThrow({
      where: {
        device_id: context.event.device_id,
        ...(portId ? { id: portId } : {}),
        ...(portNumber ? { port_number: portNumber } : {}),
        ...(channel ? { hardware_channel: channel } : {}),
      },
    });
  }

  private async portData(context: DeviceEventContext, portId: string) {
    const status =
      stringValue(context.payload, 'status') ?? statusFromEvent(context);
    const powerState =
      stringValue(context.payload, 'powerState') ?? powerFromEvent(context);
    assertIn(status, [
      'available',
      'in_use',
      'maintenance',
      'disabled',
      'fault',
    ]);
    assertIn(powerState, ['on', 'off', 'fault', 'unknown']);
    if (status === 'available' && (await this.activeSessionCount(portId)) > 0) {
      throw new BadRequestException('Port has an active charging session.');
    }
    return {
      status,
      power_state: powerState,
      last_status_changed_at: context.receiptTime,
    };
  }

  private activeSessionCount(portId: string): Promise<number> {
    return this.prisma.charging_sessions.count({
      where: { charging_port_id: portId, status: 'active' },
    });
  }
}

function statusFromEvent(context: DeviceEventContext): string | undefined {
  return context.event.event_type === 'port.fault' ? 'fault' : undefined;
}

function powerFromEvent(context: DeviceEventContext): string | undefined {
  if (context.event.event_type === 'port.power_on') return 'on';
  if (context.event.event_type === 'port.power_off') return 'off';
  if (context.event.event_type === 'port.fault') return 'fault';
  return undefined;
}

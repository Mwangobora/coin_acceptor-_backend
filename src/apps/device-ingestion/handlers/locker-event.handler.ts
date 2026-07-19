import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
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

const LOCKER_EVENTS = new Set([
  'locker.status',
  'locker.door_opened',
  'locker.door_closed',
  'locker.locked',
  'locker.unlocked',
  'locker.sensor_fault',
]);

@Injectable()
export class LockerEventHandler implements DeviceEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  canHandle(category: string, eventType: string): boolean {
    return category === 'locker' && LOCKER_EVENTS.has(eventType);
  }

  async handle(context: DeviceEventContext): Promise<void> {
    const locker = await this.findLocker(context);
    const statuses = lockerStatuses(context);
    await this.prisma.lockers.update({
      where: { id: locker.id },
      data: {
        ...statuses,
        last_seen_at: context.receiptTime,
        last_status_changed_at: context.receiptTime,
      },
    });
  }

  private async findLocker(context: DeviceEventContext) {
    const lockerId = stringValue(context.payload, 'lockerId');
    const lockerNumber = numberValue(context.payload, 'lockerNumber');
    if (lockerId) {
      const locker = await this.prisma.lockers.findFirst({
        where: { id: lockerId, device_id: context.event.device_id },
      });
      if (!locker) throw new NotFoundException('Locker not found.');
      return locker;
    }
    requireOne(lockerNumber, 'Locker identity is required.');
    return this.prisma.lockers.findFirstOrThrow({
      where: {
        device_id: context.event.device_id,
        locker_number: lockerNumber,
      },
    });
  }
}

function lockerStatuses(context: DeviceEventContext) {
  const doorStatus = doorFromEvent(context);
  const lockStatus = lockFromEvent(context);
  const sensorStatus = sensorFromEvent(context);
  assertIn(doorStatus, ['open', 'closed', 'unknown']);
  assertIn(lockStatus, ['locked', 'unlocked', 'unknown', 'fault']);
  assertIn(sensorStatus, ['normal', 'fault', 'unknown']);
  return {
    door_status: doorStatus,
    lock_status: lockStatus,
    sensor_status: sensorStatus,
  };
}

function doorFromEvent(context: DeviceEventContext) {
  if (context.event.event_type === 'locker.door_opened') return 'open';
  if (context.event.event_type === 'locker.door_closed') return 'closed';
  return stringValue(context.payload, 'doorStatus');
}

function lockFromEvent(context: DeviceEventContext) {
  if (context.event.event_type === 'locker.locked') return 'locked';
  if (context.event.event_type === 'locker.unlocked') return 'unlocked';
  return stringValue(context.payload, 'lockStatus');
}

function sensorFromEvent(context: DeviceEventContext) {
  if (context.event.event_type === 'locker.sensor_fault') return 'fault';
  return stringValue(context.payload, 'sensorStatus');
}

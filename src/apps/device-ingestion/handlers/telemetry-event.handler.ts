import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { POWER_SOURCES } from '../constants/device-event.constants';
import type {
  DeviceEventContext,
  DeviceEventHandler,
} from '../types/device-event-handler.type';
import {
  booleanValue,
  numberValue,
  objectValue,
  stringValue,
} from './handler-utils';

@Injectable()
export class TelemetryEventHandler implements DeviceEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  canHandle(category: string): boolean {
    return category === 'telemetry';
  }

  async handle(context: DeviceEventContext): Promise<void> {
    const data = telemetryData(context);
    await this.prisma.device_telemetry.create({ data });
    await this.prisma.devices.update({
      where: { id: context.event.device_id },
      data: {
        last_seen_at: context.receiptTime,
        connectivity_status: 'online',
        current_power_source: data.power_source,
      },
    });
  }
}

function telemetryData(context: DeviceEventContext) {
  const source = stringValue(context.payload, 'powerSource') ?? 'unknown';
  assertPowerSource(source);
  const observedAt = stringValue(context.payload, 'observedAt');
  return {
    device_event_id: context.event.id,
    station_id: context.event.station_id,
    device_id: context.event.device_id,
    observed_at: observedAt ? new Date(observedAt) : context.event.occurred_at,
    power_source: source,
    grid_available: booleanValue(context.payload, 'gridAvailable'),
    input_voltage: nonnegative(context, 'inputVoltage'),
    output_voltage: nonnegative(context, 'outputVoltage'),
    output_current_ma: nonnegativeInt(context, 'outputCurrentMa'),
    output_power_watts: nonnegative(context, 'outputPowerWatts'),
    battery_voltage: nonnegative(context, 'batteryVoltage'),
    battery_percentage: range(context, 'batteryPercentage', 0, 100),
    temperature_celsius: range(context, 'temperatureCelsius', -100, 200),
    connectivity_signal_dbm: rangeInt(
      context,
      'connectivitySignalDbm',
      -200,
      0,
    ),
    active_session_count: nonnegativeInt(context, 'activeSessionCount'),
    available_locker_count: nonnegativeInt(context, 'availableLockerCount'),
    fault_code: stringValue(context.payload, 'faultCode'),
    metrics: objectValue(context.payload, 'metrics') as Prisma.InputJsonObject,
  };
}

function assertPowerSource(value: string): void {
  if (!POWER_SOURCES.includes(value as never)) {
    throw new BadRequestException('Invalid powerSource.');
  }
}

function nonnegative(context: DeviceEventContext, key: string) {
  const value = numberValue(context.payload, key);
  if (value !== undefined && value < 0) throw new BadRequestException(key);
  return value;
}

function nonnegativeInt(context: DeviceEventContext, key: string) {
  const value = nonnegative(context, key);
  if (value !== undefined && !Number.isInteger(value)) {
    throw new BadRequestException(key);
  }
  return value;
}

function range(
  context: DeviceEventContext,
  key: string,
  min: number,
  max: number,
) {
  const value = numberValue(context.payload, key);
  if (value !== undefined && (value < min || value > max)) {
    throw new BadRequestException(key);
  }
  return value;
}

function rangeInt(
  context: DeviceEventContext,
  key: string,
  min: number,
  max: number,
) {
  const value = range(context, key, min, max);
  if (value !== undefined && !Number.isInteger(value)) {
    throw new BadRequestException(key);
  }
  return value;
}

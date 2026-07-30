import { BadRequestException, Injectable } from '@nestjs/common';

import type { HardwareCapabilities } from '../types/hardware-settings.types';

@Injectable()
export class HardwareCapabilitiesMapper {
  fromValue(value: unknown): HardwareCapabilities {
    const input = objectValue(value);
    return {
      lockerCount: positiveInt(input.lockerCount, 'lockerCount'),
      chargingPortCount: positiveInt(
        input.chargingPortCount,
        'chargingPortCount',
      ),
      supportsCoin: booleanValue(input.supportsCoin, 'supportsCoin'),
      supportsQr: booleanValue(input.supportsQr, 'supportsQr'),
      supportsKeypad: booleanValue(input.supportsKeypad, 'supportsKeypad'),
      supportsLcd: booleanValue(input.supportsLcd, 'supportsLcd'),
      supportsLocalTimer: booleanValue(
        input.supportsLocalTimer,
        'supportsLocalTimer',
      ),
      supportsRemoteCommands: booleanValue(
        input.supportsRemoteCommands,
        'supportsRemoteCommands',
      ),
      supportsTelemetry: booleanValue(
        input.supportsTelemetry,
        'supportsTelemetry',
      ),
      supportsWifi: booleanValue(input.supportsWifi, 'supportsWifi'),
      firmwareIntegrationStatus: stringValue(
        input.firmwareIntegrationStatus,
        'firmwareIntegrationStatus',
      ),
    };
  }
}

function objectValue(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Hardware capabilities must be an object.');
  }
  return value as Record<string, unknown>;
}

function positiveInt(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new BadRequestException(`${field} must be a positive integer.`);
  }
  return Number(value);
}

function booleanValue(value: unknown, field: string) {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${field} must be boolean.`);
  }
  return value;
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string.`);
  }
  return value;
}

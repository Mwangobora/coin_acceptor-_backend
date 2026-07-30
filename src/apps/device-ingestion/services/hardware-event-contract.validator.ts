import { BadRequestException, Injectable } from '@nestjs/common';

import type { CreateDeviceEventDto } from '../dto/create-device-event.dto';

@Injectable()
export class HardwareEventContractValidator {
  validate(dto: CreateDeviceEventDto): void {
    if (dto.eventType === 'payment.coin_inserted') {
      const payload = objectValue(dto.payload, 'payload');
      requireString(payload.paymentReference, 'paymentReference');
      requirePositiveInt(payload.pulseCount, 'pulseCount');
      requireIsoString(payload.insertedAt, 'insertedAt');
      return;
    }
    if (dto.eventType === 'command.acknowledged') {
      const payload = objectValue(dto.payload, 'payload');
      requireString(payload.commandId, 'commandId');
      requireString(payload.result, 'result');
    }
  }
}

function objectValue(value: unknown, field: string) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required.`);
  }
}

function requirePositiveInt(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new BadRequestException(`${field} must be a positive integer.`);
  }
}

function requireIsoString(value: unknown, field: string) {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`${field} must be an ISO-8601 timestamp.`);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class HardwareCommandContractValidator {
  validate(commandType: string, payload: Record<string, unknown>): void {
    if (commandType === 'charging.start') {
      requireString(payload.sessionReference, 'sessionReference');
      requirePositiveInt(payload.durationSeconds, 'durationSeconds');
      requirePositiveInt(payload.portNumber, 'portNumber');
      requireLockerIdentity(payload);
      return;
    }
    if (commandType === 'charging.stop') {
      if (stringValue(payload.sessionReference)) return;
      requirePositiveInt(payload.portNumber, 'portNumber');
      requireLockerIdentity(payload);
      return;
    }
    if (commandType === 'locker.open') {
      requireLockerIdentity(payload);
    }
  }
}

function requireLockerIdentity(payload: Record<string, unknown>) {
  if (stringValue(payload.lockerId)) return;
  requirePositiveInt(payload.lockerNumber, 'lockerNumber');
}

function requireString(value: unknown, field: string) {
  if (!stringValue(value)) {
    throw new BadRequestException(`${field} is required.`);
  }
}

function requirePositiveInt(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new BadRequestException(`${field} must be a positive integer.`);
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

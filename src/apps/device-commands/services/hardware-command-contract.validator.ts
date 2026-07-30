import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class HardwareCommandContractValidator {
  validate(commandType: string, payload: Record<string, unknown>): void {
    if (commandType === 'charging.prepare') {
      rejectPlaintextAccessCode(payload);
      requireString(payload.sessionReference, 'sessionReference');
      requireString(payload.accessCodeVerifier, 'accessCodeVerifier');
      requirePositiveInt(payload.durationSeconds, 'durationSeconds');
      requirePositiveInt(payload.portNumber, 'portNumber');
      requireLockerIdentity(payload);
      return;
    }
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

function rejectPlaintextAccessCode(payload: Record<string, unknown>) {
  if ('accessCode' in payload || 'pin' in payload || 'lockerPin' in payload) {
    throw new BadRequestException(
      'charging.prepare must not contain plaintext PIN.',
    );
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

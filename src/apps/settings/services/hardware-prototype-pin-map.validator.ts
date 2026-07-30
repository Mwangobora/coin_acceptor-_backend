import { BadRequestException, Injectable } from '@nestjs/common';

import { assertNoForbiddenJsonKeys } from '../../../common/utils/sensitive-json.util';
import type { HardwarePrototypePinMap } from '../types/hardware-settings.types';

@Injectable()
export class HardwarePrototypePinMapValidator {
  validate(value: unknown): HardwarePrototypePinMap {
    assertNoForbiddenJsonKeys(value);
    const input = objectValue(value);
    const chargingRelays = arrayValue(input.chargingRelays, 'chargingRelays');
    const lockerRelays = arrayValue(input.lockerRelays, 'lockerRelays');
    return {
      board: stringValue(input.board, 'board'),
      coinPin: nonNegativeInt(input.coinPin, 'coinPin'),
      chargingRelays: chargingRelays.map((relay, index) =>
        slotRelayRow(relay, `chargingRelays[${index}]`),
      ),
      lockerRelays: lockerRelays.map((relay, index) =>
        lockerRelayRow(relay, `lockerRelays[${index}]`),
      ),
      keypad: keypadValue(input.keypad),
      lcd: lcdValue(input.lcd),
    };
  }
}

function slotRelayRow(value: unknown, field: string) {
  const relay = objectValue(value);
  const slotNumber = nonNegativeInt(relay.slotNumber, `${field}.slotNumber`);
  const gpio = nonNegativeInt(relay.gpio, `${field}.gpio`);
  const activeLevel = stringValue(relay.activeLevel, `${field}.activeLevel`);
  if (!['LOW', 'HIGH'].includes(activeLevel)) {
    throw new BadRequestException(`${field}.activeLevel must be LOW or HIGH.`);
  }
  return { slotNumber, gpio, activeLevel: activeLevel as 'LOW' | 'HIGH' };
}

function lockerRelayRow(value: unknown, field: string) {
  const relay = objectValue(value);
  const lockerNumber = nonNegativeInt(
    relay.lockerNumber,
    `${field}.lockerNumber`,
  );
  const gpio = nonNegativeInt(relay.gpio, `${field}.gpio`);
  const activeLevel = stringValue(relay.activeLevel, `${field}.activeLevel`);
  if (!['LOW', 'HIGH'].includes(activeLevel)) {
    throw new BadRequestException(`${field}.activeLevel must be LOW or HIGH.`);
  }
  return { lockerNumber, gpio, activeLevel: activeLevel as 'LOW' | 'HIGH' };
}

function keypadValue(value: unknown) {
  const keypad = objectValue(value);
  const rowPins = numberArray(keypad.rowPins, 'keypad.rowPins');
  const columnPins = numberArray(keypad.columnPins, 'keypad.columnPins');
  const rows = nonNegativeInt(keypad.rows, 'keypad.rows');
  const columns = nonNegativeInt(keypad.columns, 'keypad.columns');
  if (rowPins.length !== rows || columnPins.length !== columns) {
    throw new BadRequestException('keypad pins must match keypad dimensions.');
  }
  return { rows, columns, rowPins, columnPins };
}

function lcdValue(value: unknown) {
  const lcd = objectValue(value);
  return {
    type: stringValue(lcd.type, 'lcd.type'),
    address: stringValue(lcd.address, 'lcd.address'),
    columns: nonNegativeInt(lcd.columns, 'lcd.columns'),
    rows: nonNegativeInt(lcd.rows, 'lcd.rows'),
  };
}

function objectValue(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Hardware pin map must be an object.');
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty array.`);
  }
  return value as unknown[];
}

function numberArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => !Number.isInteger(item))) {
    throw new BadRequestException(`${field} must contain integers.`);
  }
  return value.map((item) => Number(item as number));
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string.`);
  }
  return value;
}

function nonNegativeInt(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new BadRequestException(`${field} must be a valid integer.`);
  }
  return Number(value);
}

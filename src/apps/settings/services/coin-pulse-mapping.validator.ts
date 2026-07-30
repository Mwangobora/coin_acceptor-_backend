import { BadRequestException, Injectable } from '@nestjs/common';

import {
  COIN_SETTLE_WINDOW_MAX_MS,
  COIN_SETTLE_WINDOW_MIN_MS,
} from '../constants/hardware-settings.constants';
import type {
  CoinPulseMapping,
  CoinPulseResolution,
} from '../types/hardware-settings.types';

@Injectable()
export class CoinPulseMappingValidator {
  validate(value: unknown): CoinPulseMapping {
    const mapping = objectValue(value);
    const currency = stringValue(mapping.currency, 'currency');
    const settleWindowMs = positiveInt(
      mapping.settleWindowMs,
      'settleWindowMs',
      COIN_SETTLE_WINDOW_MIN_MS,
      COIN_SETTLE_WINDOW_MAX_MS,
    );
    if (currency !== currency.toUpperCase()) {
      throw new BadRequestException('currency must be uppercase.');
    }
    const entries = arrayValue(mapping.entries, 'entries').map((entry, index) =>
      parseEntry(entry, index),
    );
    const uniquePulses = new Set(entries.map((entry) => entry.pulseCount));
    if (uniquePulses.size !== entries.length) {
      throw new BadRequestException('pulseCount entries must be unique.');
    }
    return { currency, settleWindowMs, entries };
  }

  resolve(value: unknown, pulseCount: number): CoinPulseResolution | null {
    const mapping = this.validate(value);
    const entry = mapping.entries.find(
      (item) => item.pulseCount === pulseCount,
    );
    if (!entry) return null;
    return {
      currency: mapping.currency,
      settleWindowMs: mapping.settleWindowMs,
      pulseCount: entry.pulseCount,
      amountMinor: entry.amountMinor,
      durationSeconds: entry.durationSeconds,
    };
  }
}

function parseEntry(value: unknown, index: number) {
  const entry = objectValue(value);
  return {
    pulseCount: positiveInt(entry.pulseCount, `entries[${index}].pulseCount`),
    amountMinor: positiveInt(
      entry.amountMinor,
      `entries[${index}].amountMinor`,
    ),
    durationSeconds: positiveInt(
      entry.durationSeconds,
      `entries[${index}].durationSeconds`,
    ),
  };
}

function objectValue(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Coin pulse mapping must be an object.');
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty array.`);
  }
  return value as unknown[];
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string.`);
  }
  return value;
}

function positiveInt(
  value: unknown,
  field: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new BadRequestException(`${field} must be a valid integer.`);
  }
  return Number(value);
}

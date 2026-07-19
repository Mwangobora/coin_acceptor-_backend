import { BadRequestException } from '@nestjs/common';

export function stringValue(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function numberValue(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function booleanValue(
  payload: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = payload[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function objectValue(
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = payload[key];
  if (value === undefined) return {};
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new BadRequestException(`${key} must be an object.`);
}

export function requireOne<T>(value: T | undefined, message: string): T {
  if (value === undefined || value === null || value === '') {
    throw new BadRequestException(message);
  }
  return value;
}

export function assertIn(
  value: string | undefined,
  allowed: readonly string[],
) {
  if (value !== undefined && !allowed.includes(value)) {
    throw new BadRequestException('Payload contains an invalid status value.');
  }
}

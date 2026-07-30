import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

const FORBIDDEN_KEYS = new Set([
  'password',
  'apikey',
  'api_key',
  'secret',
  'sharedsecret',
  'shared_secret',
  'hmacsecret',
  'hmac_secret',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'credential',
  'credentials',
  'accesscode',
  'access_code',
  'lockercode',
  'locker_code',
]);

export function assertNoForbiddenJsonKeys(value: unknown, depth = 0): void {
  if (depth > 8 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoForbiddenJsonKeys(item, depth + 1));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
      throw new BadRequestException('JSON payload contains forbidden fields.');
    }
    assertNoForbiddenJsonKeys(nested, depth + 1);
  }
}

export function sanitizeSensitiveJson(
  value: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value))
    return value.map((item) => sanitizeSensitiveJson(item));
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !FORBIDDEN_KEYS.has(normalizeKey(key)),
    ),
  );
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

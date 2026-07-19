import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

const SENSITIVE_KEYS = new Set([
  'password',
  'apikey',
  'api_key',
  'secret',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'credential',
  'credentials',
]);

@Injectable()
export class CommandPayloadSanitizerService {
  assertSafe(value: unknown, depth = 0): void {
    if (depth > 8 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => this.assertSafe(item, depth + 1));
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(normalize(key))) {
        throw new BadRequestException(
          'Command payload contains forbidden fields.',
        );
      }
      this.assertSafe(nested, depth + 1);
    }
  }
}

export function sanitizeJson(
  value: Prisma.JsonValue | null,
): Prisma.JsonValue | null {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item));
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !SENSITIVE_KEYS.has(normalize(key)),
    ),
  );
}

function normalize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

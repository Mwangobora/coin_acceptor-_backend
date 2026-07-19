import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

const SENSITIVE_KEYS = new Set([
  'password',
  'pin',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'credential',
  'credentials',
  'privatekey',
  'private_key',
]);

@Injectable()
export class PaymentSanitizerService {
  assertSafe(value: unknown, depth = 0): void {
    if (depth > 8 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => this.assertSafe(item, depth + 1));
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(normalize(key))) {
        throw new BadRequestException(
          'Payment payload contains forbidden fields.',
        );
      }
      this.assertSafe(nested, depth + 1);
    }
  }
}

export function sanitizeJson(value: unknown): Prisma.InputJsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(normalize(key)))
      .slice(0, 50),
  );
}

function normalize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

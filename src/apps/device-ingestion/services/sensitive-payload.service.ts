import { BadRequestException, Injectable } from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'password',
  'apikey',
  'api_key',
  'secret',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'phonefiles',
  'phone_files',
  'contacts',
  'messages',
]);

@Injectable()
export class SensitivePayloadService {
  assertSafe(value: unknown, depth = 0): void {
    if (depth > 8 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item) => this.assertSafe(item, depth + 1));
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(normalize(key))) {
        throw new BadRequestException('Payload contains forbidden fields.');
      }
      this.assertSafe(nested, depth + 1);
    }
  }
}

function normalize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

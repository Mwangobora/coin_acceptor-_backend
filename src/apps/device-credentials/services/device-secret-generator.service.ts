import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

@Injectable()
export class DeviceSecretGenerator {
  keyId(type: string): string {
    return `cred_${type}_${randomBytes(9).toString('base64url')}`;
  }

  apiKey(): string {
    return `cak_${randomBytes(32).toString('base64url')}`;
  }

  hmacSecret(): string {
    return randomBytes(32).toString('base64url');
  }
}

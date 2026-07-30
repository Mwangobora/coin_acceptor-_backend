import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { PUBLIC_TOKEN_BYTES } from '../constants/public-charging.constants';

@Injectable()
export class PublicTokenCryptoService {
  generate(): string {
    return randomBytes(PUBLIC_TOKEN_BYTES).toString('base64url');
  }

  hash(value: string): string {
    return createHash('sha256').update(this.normalize(value)).digest('hex');
  }

  normalize(value: string): string {
    return value.trim();
  }

  safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}

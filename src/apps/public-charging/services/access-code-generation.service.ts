import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class AccessCodeGenerationService {
  generate(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const pin = randomInt(0, 10_000).toString().padStart(4, '0');
      if (strongEnough(pin)) return pin;
    }
    return '4839';
  }
}

function strongEnough(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return false;
  if (/^(\d)\1{3}$/.test(pin)) return false;
  const digits = [...pin].map(Number);
  const ascending = digits.every(
    (digit, index) => index === 0 || digit === digits[index - 1] + 1,
  );
  const descending = digits.every(
    (digit, index) => index === 0 || digit === digits[index - 1] - 1,
  );
  return !ascending && !descending;
}

import { randomBytes } from 'node:crypto';

export function paymentReference(): string {
  return `PAY-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

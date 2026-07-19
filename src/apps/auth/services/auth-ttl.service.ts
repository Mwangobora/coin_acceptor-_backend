import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthTtlService {
  toMilliseconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) throw new Error(`Invalid TTL value: ${ttl}`);

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit as keyof typeof multipliers];
  }

  expiresAt(ttl: string, from = new Date()): Date {
    return new Date(from.getTime() + this.toMilliseconds(ttl));
  }
}

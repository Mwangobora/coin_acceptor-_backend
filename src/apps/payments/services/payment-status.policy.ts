import { ConflictException, Injectable } from '@nestjs/common';

const TERMINAL = new Set(['failed', 'expired', 'cancelled', 'refunded']);

@Injectable()
export class PaymentStatusPolicy {
  assertTransition(from: string, to: string): void {
    if (from === to) return;
    if (TERMINAL.has(from) || (from === 'confirmed' && to !== 'refunded')) {
      throw new ConflictException('Payment is already terminal.');
    }
    const allowed = {
      pending: ['processing', 'confirmed', 'failed', 'expired', 'cancelled'],
      processing: ['confirmed', 'failed', 'expired', 'cancelled'],
      confirmed: ['refunded'],
    } as Record<string, string[]>;
    if (!allowed[from]?.includes(to)) {
      throw new ConflictException('Payment status transition is not allowed.');
    }
  }

  assertConfirm(received: bigint, expected: bigint, confirmedAt?: Date): void {
    if (received < expected || !confirmedAt) {
      throw new ConflictException(
        'Confirmed payments require sufficient money.',
      );
    }
  }

  isTerminal(status: string): boolean {
    return TERMINAL.has(status) || status === 'confirmed';
  }
}

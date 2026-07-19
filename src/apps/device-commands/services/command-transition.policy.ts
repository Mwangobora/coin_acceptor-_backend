import { ConflictException, Injectable } from '@nestjs/common';

import type { CommandAckResult } from '../constants/device-command.constants';

const TERMINAL = new Set(['completed', 'failed', 'expired', 'cancelled']);

@Injectable()
export class CommandTransitionPolicy {
  assertCanCancel(status: string): void {
    if (status !== 'queued') {
      throw new ConflictException('Only queued commands can be cancelled.');
    }
  }

  assertCanAcknowledge(status: string, result: CommandAckResult): void {
    if (status === 'sent') return;
    if (status === 'acknowledged' && result !== 'acknowledged') return;
    if (TERMINAL.has(status)) {
      throw new ConflictException('Command is already terminal.');
    }
    throw new ConflictException('Command has not been sent.');
  }

  isDuplicateAck(status: string, result: CommandAckResult): boolean {
    return (
      (status === 'acknowledged' && result === 'acknowledged') ||
      status === result
    );
  }
}

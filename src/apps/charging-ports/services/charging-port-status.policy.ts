import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { charging_ports } from '@prisma/client';

@Injectable()
export class ChargingPortStatusPolicy {
  validate(input: {
    port: charging_ports;
    nextStatus: string;
    reason?: string;
    activeSessionCount: number;
  }) {
    if (
      ['maintenance', 'disabled'].includes(input.nextStatus) &&
      !input.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required.');
    }
    if (
      ['maintenance', 'disabled'].includes(input.nextStatus) &&
      input.activeSessionCount > 0
    ) {
      throw new ConflictException('Port has an active charging session.');
    }
    if (
      input.nextStatus === 'available' &&
      ['on', 'fault'].includes(input.port.power_state)
    ) {
      throw new ConflictException('Port power state prevents availability.');
    }
  }

  data(nextStatus: string, reason?: string) {
    return {
      status: nextStatus,
      last_status_changed_at: new Date(),
      maintenance_reason: nextStatus === 'available' ? null : reason,
    };
  }
}

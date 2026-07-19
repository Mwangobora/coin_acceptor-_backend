import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { lockers } from '@prisma/client';

@Injectable()
export class LockerAvailabilityPolicy {
  validate(input: {
    locker: lockers;
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
    if (input.activeSessionCount > 0) {
      throw new ConflictException('Locker has an active charging session.');
    }
    if (
      input.nextStatus === 'available' &&
      input.locker.door_status === 'open'
    ) {
      throw new ConflictException('Open lockers cannot be marked available.');
    }
    if (
      input.nextStatus === 'available' &&
      input.locker.lock_status === 'fault'
    ) {
      throw new ConflictException('Faulted locks cannot be marked available.');
    }
  }

  data(nextStatus: string, reason?: string) {
    return {
      availability_status: nextStatus,
      last_status_changed_at: new Date(),
      maintenance_reason: nextStatus === 'available' ? null : reason,
    };
  }
}

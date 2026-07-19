import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { devices } from '@prisma/client';

const transitions: Record<string, string[]> = {
  pending: ['active', 'disabled'],
  active: ['maintenance', 'disabled', 'decommissioned'],
  maintenance: ['active', 'disabled', 'decommissioned'],
  disabled: ['active', 'decommissioned'],
  decommissioned: [],
};

@Injectable()
export class DeviceLifecyclePolicy {
  validate(input: {
    currentStatus: string;
    nextStatus: string;
    reason?: string;
    activeSessionCount: number;
  }): void {
    if (!transitions[input.currentStatus]?.includes(input.nextStatus)) {
      if (input.currentStatus !== input.nextStatus) {
        throw new ConflictException('Invalid lifecycle status transition.');
      }
    }
    if (
      ['maintenance', 'disabled', 'decommissioned'].includes(
        input.nextStatus,
      ) &&
      !input.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required.');
    }
    if (input.nextStatus === 'decommissioned' && input.activeSessionCount > 0) {
      throw new ConflictException('Device has an active charging session.');
    }
  }

  transitionData(device: devices, nextStatus: string) {
    const now = new Date();
    return {
      lifecycle_status: nextStatus,
      ...(nextStatus === 'active' && !device.activated_at
        ? { activated_at: now }
        : {}),
      ...(nextStatus === 'active' ? { maintenance_started_at: null } : {}),
      ...(nextStatus === 'maintenance' ? { maintenance_started_at: now } : {}),
      ...(device.lifecycle_status === 'maintenance' &&
      nextStatus !== 'maintenance'
        ? { maintenance_started_at: null }
        : {}),
      ...(nextStatus === 'decommissioned' ? { decommissioned_at: now } : {}),
    };
  }
}

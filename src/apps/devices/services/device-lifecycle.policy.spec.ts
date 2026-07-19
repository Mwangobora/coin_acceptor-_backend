import { BadRequestException, ConflictException } from '@nestjs/common';
import type { devices } from '@prisma/client';

import { DeviceLifecyclePolicy } from './device-lifecycle.policy';

describe('DeviceLifecyclePolicy', () => {
  const policy = new DeviceLifecyclePolicy();
  const device = {
    lifecycle_status: 'maintenance',
    activated_at: new Date('2026-01-01T00:00:00.000Z'),
  } as devices;

  it('rejects invalid lifecycle transitions', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'pending',
        nextStatus: 'decommissioned',
        activeSessionCount: 0,
      }),
    ).toThrow(ConflictException);
  });

  it('requires reasons for disabling statuses', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'active',
        nextStatus: 'disabled',
        activeSessionCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('blocks decommission with active charging sessions', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'active',
        nextStatus: 'decommissioned',
        reason: 'retired',
        activeSessionCount: 1,
      }),
    ).toThrow(ConflictException);
  });

  it('preserves first activation timestamp when reactivating', () => {
    expect(policy.transitionData(device, 'active')).toEqual({
      lifecycle_status: 'active',
      maintenance_started_at: null,
    });
  });
});

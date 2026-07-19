import { BadRequestException, ConflictException } from '@nestjs/common';

import { LockerAvailabilityPolicy } from './locker-availability.policy';

describe('LockerAvailabilityPolicy', () => {
  const policy = new LockerAvailabilityPolicy();
  const locker = { door_status: 'closed', lock_status: 'locked' } as never;

  it('requires reasons and blocks active sessions', () => {
    expect(() =>
      policy.validate({
        locker,
        nextStatus: 'disabled',
        activeSessionCount: 0,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.validate({
        locker,
        nextStatus: 'available',
        activeSessionCount: 1,
      }),
    ).toThrow(ConflictException);
  });

  it('blocks unsafe available states and clears maintenance reason', () => {
    expect(() =>
      policy.validate({
        locker: { door_status: 'open', lock_status: 'locked' } as never,
        nextStatus: 'available',
        activeSessionCount: 0,
      }),
    ).toThrow(ConflictException);
    expect(policy.data('available').maintenance_reason).toBeNull();
  });
});

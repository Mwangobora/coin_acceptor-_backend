import { BadRequestException, ConflictException } from '@nestjs/common';

import { ChargingPortStatusPolicy } from './charging-port-status.policy';

describe('ChargingPortStatusPolicy', () => {
  const policy = new ChargingPortStatusPolicy();

  it('requires reasons and blocks active sessions', () => {
    expect(() =>
      policy.validate({
        port: { power_state: 'off' } as never,
        nextStatus: 'maintenance',
        activeSessionCount: 0,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.validate({
        port: { power_state: 'off' } as never,
        nextStatus: 'disabled',
        reason: 'test',
        activeSessionCount: 1,
      }),
    ).toThrow(ConflictException);
  });

  it('blocks availability while power state is unsafe', () => {
    expect(() =>
      policy.validate({
        port: { power_state: 'on' } as never,
        nextStatus: 'available',
        activeSessionCount: 0,
      }),
    ).toThrow(ConflictException);
  });
});

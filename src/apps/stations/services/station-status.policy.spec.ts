import { BadRequestException, ConflictException } from '@nestjs/common';

import { StationStatusPolicy } from './station-status.policy';

describe('StationStatusPolicy', () => {
  const policy = new StationStatusPolicy();

  it('requires reasons for restrictive statuses', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'active',
        nextStatus: 'inactive',
        activeDeviceCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('treats decommissioned stations as terminal', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'decommissioned',
        nextStatus: 'active',
        activeDeviceCount: 0,
      }),
    ).toThrow(ConflictException);
  });

  it('blocks decommission while devices remain active', () => {
    expect(() =>
      policy.validate({
        currentStatus: 'inactive',
        nextStatus: 'decommissioned',
        reason: 'retired',
        activeDeviceCount: 1,
      }),
    ).toThrow(ConflictException);
  });
});

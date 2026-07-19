import { BadRequestException } from '@nestjs/common';

import { CommandRequirementsPolicy } from './command-requirements.policy';

describe('CommandRequirementsPolicy', () => {
  const policy = new CommandRequirementsPolicy();

  it('maps high-risk command permissions', () => {
    expect(policy.extraPermission('locker.emergency_open')).toBe(
      'lockers.emergency_open',
    );
    expect(policy.extraPermission('device.restart')).toBe('devices.restart');
    expect(policy.extraPermission('device.sync_configuration')).toBe(
      'devices.configure',
    );
    expect(policy.extraPermission('device.status_request')).toBeUndefined();
  });

  it('validates reasons and command time windows', () => {
    expect(() => policy.assertReason('locker.emergency_open')).toThrow(
      BadRequestException,
    );
    const requestedAt = new Date('2026-01-01T00:00:00.000Z');
    expect(() =>
      policy.assertTimes(
        { availableAt: '2025-12-31T23:59:59.000Z' } as never,
        requestedAt,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.assertTimes(
        { expiresAt: '2026-01-01T00:00:00.000Z' } as never,
        requestedAt,
      ),
    ).toThrow(BadRequestException);
  });
});

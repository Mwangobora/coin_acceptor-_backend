import type { lockers } from '@prisma/client';

import { mapLocker } from './locker.mapper';

describe('mapLocker', () => {
  it('maps locker fields to camelCase', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const locker: lockers = {
      id: 'locker-1',
      device_id: 'device-1',
      locker_number: 1,
      label: 'A1',
      availability_status: 'available',
      door_status: 'unknown',
      lock_status: 'unknown',
      sensor_status: 'unknown',
      last_status_changed_at: null,
      last_seen_at: null,
      maintenance_reason: null,
      created_at: now,
      updated_at: now,
    };

    expect(mapLocker(locker)).toMatchObject({
      deviceId: 'device-1',
      lockerNumber: 1,
      availabilityStatus: 'available',
    });
  });
});

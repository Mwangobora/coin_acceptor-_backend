import type { devices } from '@prisma/client';

import { mapDevice } from './device.mapper';

describe('mapDevice', () => {
  it('sanitizes sensitive metadata keys', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const device: devices = {
      id: 'device-1',
      station_id: 'station-1',
      device_code: 'DEVICE_1',
      serial_number: 'SERIAL_1',
      name: 'Device 1',
      manufacturer: null,
      model: null,
      firmware_version: null,
      hardware_version: null,
      lifecycle_status: 'pending',
      connectivity_status: 'unknown',
      operational_status: 'idle',
      current_power_source: 'unknown',
      expected_heartbeat_interval_seconds: 60,
      last_seen_at: null,
      last_ip_address: null,
      activated_at: null,
      installed_at: null,
      maintenance_started_at: null,
      decommissioned_at: null,
      metadata: { location: 'north', secretToken: 'hidden' },
      created_at: now,
      updated_at: now,
      created_by_user_id: null,
    };
    const result = mapDevice(device);

    expect(result.metadata).toEqual({ location: 'north' });
  });
});

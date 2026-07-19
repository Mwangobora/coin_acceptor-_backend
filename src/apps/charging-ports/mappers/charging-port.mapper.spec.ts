import type { charging_ports } from '@prisma/client';

import { mapChargingPort } from './charging-port.mapper';

describe('mapChargingPort', () => {
  it('maps charging port fields to camelCase', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const port: charging_ports = {
      id: 'port-1',
      device_id: 'device-1',
      locker_id: 'locker-1',
      port_number: 1,
      port_type: 'usb_c',
      hardware_channel: null,
      status: 'available',
      power_state: 'off',
      maximum_voltage: null,
      maximum_current_ma: null,
      maximum_power_watts: null,
      last_status_changed_at: null,
      maintenance_reason: null,
      created_at: now,
      updated_at: now,
    };

    expect(mapChargingPort(port)).toMatchObject({
      lockerId: 'locker-1',
      portNumber: 1,
      powerState: 'off',
    });
  });
});

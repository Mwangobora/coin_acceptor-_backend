import { ChargingPortQueryBuilder } from './charging-port-query.builder';

describe('ChargingPortQueryBuilder', () => {
  const builder = new ChargingPortQueryBuilder();

  it('builds all optional filters', () => {
    expect(
      builder.filterWhere({
        page: 1,
        pageSize: 20,
        sortOrder: 'asc',
        deviceId: 'device-1',
        lockerId: 'locker-1',
        portType: 'usb_c',
        status: 'available',
        powerState: 'off',
      }),
    ).toEqual({
      device_id: 'device-1',
      locker_id: 'locker-1',
      port_type: 'usb_c',
      status: 'available',
      power_state: 'off',
    });
  });

  it('sorts by known and fallback fields', () => {
    expect(builder.orderBy('portNumber', 'desc')).toEqual([
      { port_number: 'desc' },
      { id: 'asc' },
    ]);
    expect(builder.orderBy('unknown', 'asc')).toEqual([
      { created_at: 'asc' },
      { id: 'asc' },
    ]);
  });
});

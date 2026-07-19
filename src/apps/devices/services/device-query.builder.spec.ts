import { DeviceQueryBuilder } from './device-query.builder';

describe('DeviceQueryBuilder', () => {
  const builder = new DeviceQueryBuilder();

  it('builds optional filters including last-seen ranges', () => {
    expect(
      builder.filterWhere({
        stationId: 'station-1',
        lifecycleStatus: 'active',
        connectivityStatus: 'offline',
        operationalStatus: 'idle',
        currentPowerSource: 'grid',
        search: 'coin',
        lastSeenFrom: '2026-01-01T00:00:00.000Z',
        lastSeenTo: '2026-01-02T00:00:00.000Z',
      } as never),
    ).toMatchObject({ station_id: 'station-1', lifecycle_status: 'active' });
    expect(builder.orderBy('unknown', 'desc')).toEqual([
      { created_at: 'desc' },
      { id: 'asc' },
    ]);
  });
});

import { CommandQueryBuilder } from './command-query.builder';

describe('CommandQueryBuilder', () => {
  it('builds filtered command queries and stable order clauses', async () => {
    const builder = new CommandQueryBuilder({
      deviceWhere: jest.fn().mockResolvedValue({ station_id: 'station-1' }),
    } as never);
    await expect(
      builder.where(
        {
          stationId: 'station-1',
          deviceId: 'device-1',
          commandType: 'device.status_request',
          status: 'queued',
          requestedByUserId: 'user-1',
          requestedFrom: '2026-01-01T00:00:00.000Z',
          requestedTo: '2026-01-02T00:00:00.000Z',
        } as never,
        'user-1',
      ),
    ).resolves.toMatchObject({
      device_id: 'device-1',
      command_type: 'device.status_request',
    });
    expect(builder.orderBy('availableAt', 'asc')).toEqual([
      { available_at: 'asc' },
      { id: 'asc' },
    ]);
    expect(builder.orderBy('unknown', 'desc')[0]).toEqual({
      requested_at: 'desc',
    });
  });
});

import { LockerQueryBuilder } from './locker-query.builder';

describe('LockerQueryBuilder', () => {
  const builder = new LockerQueryBuilder();

  it('builds status filters and text search', () => {
    const where = builder.filterWhere({
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      deviceId: 'device-1',
      availabilityStatus: 'available',
      doorStatus: 'closed',
      lockStatus: 'locked',
      sensorStatus: 'clear',
      search: '12',
    });

    expect(where).toMatchObject({
      device_id: 'device-1',
      availability_status: 'available',
      door_status: 'closed',
      lock_status: 'locked',
      sensor_status: 'clear',
    });
    expect(where.OR).toContainEqual({ locker_number: 12 });
  });

  it('omits numeric search when search is text', () => {
    const terms =
      builder.filterWhere({
        page: 1,
        pageSize: 20,
        sortOrder: 'asc',
        search: 'alpha',
      }).OR ?? [];

    expect(terms.some((term) => 'locker_number' in term)).toBe(false);
  });

  it('sorts by locker number', () => {
    expect(builder.orderBy('lockerNumber', 'desc')).toEqual([
      { locker_number: 'desc' },
      { id: 'asc' },
    ]);
  });
});

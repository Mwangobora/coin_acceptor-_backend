import { StationQueryBuilder } from './station-query.builder';

describe('StationQueryBuilder', () => {
  const builder = new StationQueryBuilder();

  it('builds optional filters and stable fallback ordering', () => {
    expect(
      builder.filterWhere({
        search: 'dar',
        status: 'active',
        stationType: 'brt_station',
        region: 'Dar',
        district: 'Ilala',
      } as never),
    ).toMatchObject({ status: 'active', station_type: 'brt_station' });
    expect(builder.orderBy('unknown', 'desc')).toEqual([
      { created_at: 'desc' },
      { id: 'asc' },
    ]);
  });
});

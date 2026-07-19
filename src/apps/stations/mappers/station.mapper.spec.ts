import type { stations } from '@prisma/client';

import { mapStation } from './station.mapper';

describe('mapStation', () => {
  it('returns camelCase station responses with summaries', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const station: stations = {
      id: 'station-1',
      code: 'STATION_1',
      name: 'Station 1',
      station_type: 'brt_station',
      description: null,
      region: 'Dar',
      district: null,
      ward: null,
      address: null,
      latitude: null,
      longitude: null,
      timezone: 'Africa/Dar_es_Salaam',
      status: 'active',
      installed_at: null,
      created_at: now,
      updated_at: now,
      created_by_user_id: null,
    };
    const result = mapStation(station, {
      totalDevices: 1,
      activeDevices: 1,
      offlineDevices: 0,
    });

    expect(result).toMatchObject({
      stationType: 'brt_station',
      createdAt: now.toISOString(),
      totalDevices: 1,
    });
  });
});

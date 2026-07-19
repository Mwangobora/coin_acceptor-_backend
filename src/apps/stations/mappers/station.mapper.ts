import type { stations } from '@prisma/client';

import type { StationResponse } from '../types/station-response.type';

export function mapStation(
  station: stations,
  summary?: {
    totalDevices: number;
    activeDevices: number;
    offlineDevices: number;
  },
): StationResponse {
  return {
    id: station.id,
    code: station.code,
    name: station.name,
    stationType: station.station_type,
    description: station.description,
    region: station.region,
    district: station.district,
    ward: station.ward,
    address: station.address,
    latitude: station.latitude?.toString() ?? null,
    longitude: station.longitude?.toString() ?? null,
    timezone: station.timezone,
    status: station.status,
    installedAt: station.installed_at?.toISOString() ?? null,
    createdAt: station.created_at.toISOString(),
    updatedAt: station.updated_at.toISOString(),
    createdByUserId: station.created_by_user_id,
    ...summary,
  };
}

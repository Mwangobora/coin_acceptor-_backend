import type { devices, lockers } from '@prisma/client';

import type { LockerResponse } from '../types/locker-response.type';

export function mapLocker(
  locker: lockers & { devices?: devices },
  summary?: {
    totalPorts: number;
    availablePorts: number;
    hasActiveSession: boolean;
  },
): LockerResponse {
  return {
    id: locker.id,
    deviceId: locker.device_id,
    lockerNumber: locker.locker_number,
    label: locker.label,
    availabilityStatus: locker.availability_status,
    doorStatus: locker.door_status,
    lockStatus: locker.lock_status,
    sensorStatus: locker.sensor_status,
    lastStatusChangedAt: locker.last_status_changed_at?.toISOString() ?? null,
    lastSeenAt: locker.last_seen_at?.toISOString() ?? null,
    maintenanceReason: locker.maintenance_reason,
    createdAt: locker.created_at.toISOString(),
    updatedAt: locker.updated_at.toISOString(),
    ...(locker.devices
      ? {
          device: {
            id: locker.devices.id,
            stationId: locker.devices.station_id,
            deviceCode: locker.devices.device_code,
            name: locker.devices.name,
          },
        }
      : {}),
    ...summary,
  };
}

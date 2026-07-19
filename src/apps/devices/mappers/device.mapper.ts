import type { devices } from '@prisma/client';

import type { DeviceResponse } from '../types/device-response.type';

export function mapDevice(
  device: devices,
  summary?: {
    totalLockers: number;
    availableLockers: number;
    totalPorts: number;
    activeSessions: number;
  },
): DeviceResponse {
  return {
    id: device.id,
    stationId: device.station_id,
    deviceCode: device.device_code,
    serialNumber: device.serial_number,
    name: device.name,
    manufacturer: device.manufacturer,
    model: device.model,
    firmwareVersion: device.firmware_version,
    hardwareVersion: device.hardware_version,
    lifecycleStatus: device.lifecycle_status,
    connectivityStatus: device.connectivity_status,
    operationalStatus: device.operational_status,
    currentPowerSource: device.current_power_source,
    expectedHeartbeatIntervalSeconds:
      device.expected_heartbeat_interval_seconds,
    lastSeenAt: device.last_seen_at?.toISOString() ?? null,
    activatedAt: device.activated_at?.toISOString() ?? null,
    installedAt: device.installed_at?.toISOString() ?? null,
    maintenanceStartedAt: device.maintenance_started_at?.toISOString() ?? null,
    decommissionedAt: device.decommissioned_at?.toISOString() ?? null,
    metadata: sanitizeMetadata(device.metadata),
    createdAt: device.created_at.toISOString(),
    updatedAt: device.updated_at.toISOString(),
    createdByUserId: device.created_by_user_id,
    ...summary,
  };
}

function sanitizeMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => !/(secret|credential|password|token|cookie|hash)/i.test(key),
    ),
  );
}

import type { charging_ports, devices, lockers } from '@prisma/client';

import type { ChargingPortResponse } from '../types/charging-port-response.type';

export function mapChargingPort(
  port: charging_ports & { devices?: devices; lockers?: lockers },
  summary?: { hasActiveSession: boolean },
): ChargingPortResponse {
  return {
    id: port.id,
    deviceId: port.device_id,
    lockerId: port.locker_id,
    portNumber: port.port_number,
    portType: port.port_type,
    hardwareChannel: port.hardware_channel,
    status: port.status,
    powerState: port.power_state,
    maximumVoltage: port.maximum_voltage?.toString() ?? null,
    maximumCurrentMa: port.maximum_current_ma,
    maximumPowerWatts: port.maximum_power_watts?.toString() ?? null,
    lastStatusChangedAt: port.last_status_changed_at?.toISOString() ?? null,
    maintenanceReason: port.maintenance_reason,
    createdAt: port.created_at.toISOString(),
    updatedAt: port.updated_at.toISOString(),
    ...(port.lockers
      ? {
          locker: {
            id: port.lockers.id,
            lockerNumber: port.lockers.locker_number,
            label: port.lockers.label,
          },
        }
      : {}),
    ...(port.devices
      ? {
          device: {
            id: port.devices.id,
            stationId: port.devices.station_id,
            deviceCode: port.devices.device_code,
            name: port.devices.name,
          },
        }
      : {}),
    ...summary,
  };
}

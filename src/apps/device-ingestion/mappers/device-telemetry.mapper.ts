import type { device_telemetry } from '@prisma/client';

export function mapDeviceTelemetry(item: device_telemetry) {
  return {
    id: item.id,
    deviceEventId: item.device_event_id,
    stationId: item.station_id,
    deviceId: item.device_id,
    observedAt: item.observed_at,
    powerSource: item.power_source,
    gridAvailable: item.grid_available,
    inputVoltage: item.input_voltage?.toNumber() ?? null,
    outputVoltage: item.output_voltage?.toNumber() ?? null,
    outputCurrentMa: item.output_current_ma,
    outputPowerWatts: item.output_power_watts?.toNumber() ?? null,
    batteryVoltage: item.battery_voltage?.toNumber() ?? null,
    batteryPercentage: item.battery_percentage?.toNumber() ?? null,
    temperatureCelsius: item.temperature_celsius?.toNumber() ?? null,
    connectivitySignalDbm: item.connectivity_signal_dbm,
    activeSessionCount: item.active_session_count,
    availableLockerCount: item.available_locker_count,
    faultCode: item.fault_code,
    metrics: item.metrics,
    createdAt: item.created_at,
  };
}

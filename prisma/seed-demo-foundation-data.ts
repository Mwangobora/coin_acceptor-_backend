import { ids } from './seed-demo-ids';
import { hashSecret } from './seed-utils';

export function station() {
  return {
    id: ids.station,
    code: 'DEMO-STATION-001',
    name: 'Demo BRT Charging Station',
    station_type: 'brt_station',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    address: 'Demo transport terminal',
    latitude: -6.7924,
    longitude: 39.2083,
    status: 'active',
    installed_at: new Date('2026-07-01T08:00:00.000Z'),
  };
}

export function device() {
  return {
    id: ids.device,
    station_id: ids.station,
    device_code: 'DEMO-DEVICE-001',
    serial_number: 'DEMO-SN-001',
    name: 'Demo Coin and QR Charger',
    manufacturer: 'Demo Manufacturer',
    model: 'DCQ-4',
    firmware_version: '1.0.0-demo',
    lifecycle_status: 'active',
    connectivity_status: 'online',
    operational_status: 'partially_available',
    current_power_source: 'grid',
    last_seen_at: new Date(),
    installed_at: new Date('2026-07-01T08:30:00.000Z'),
    activated_at: new Date('2026-07-01T09:00:00.000Z'),
    metadata: { seed: 'demo' },
  };
}

export async function credential() {
  return {
    id: ids.credential,
    device_id: ids.device,
    key_id: 'DEMO-DEVICE-001-API-KEY',
    credential_type: 'api_key',
    secret_hash: await hashSecret('demo-device-api-key-development-only'),
    status: 'active',
    valid_from: new Date('2026-07-01T09:00:00.000Z'),
  };
}

export function locker(index: number) {
  return {
    id: ids.lockers[index],
    device_id: ids.device,
    locker_number: index + 1,
    label: `Locker ${index + 1}`,
    availability_status: index === 1 ? 'in_use' : 'available',
    door_status: 'closed',
    lock_status: 'locked',
    sensor_status: 'normal',
    last_status_changed_at: new Date(),
  };
}

export function port(index: number) {
  return {
    id: ids.ports[index],
    device_id: ids.device,
    locker_id: ids.lockers[index],
    port_number: 1,
    port_type: index % 2 === 0 ? 'usb_c' : 'usb_a',
    hardware_channel: `CH-${index + 1}`,
    status: index === 1 ? 'in_use' : 'available',
    power_state: index === 1 ? 'on' : 'off',
    maximum_voltage: 5,
    maximum_current_ma: 2400,
    maximum_power_watts: 12,
  };
}

export function packages() {
  return [
    packageRow(0, 'DEMO-15MIN', 'Demo 15 Minutes', 900, 500),
    packageRow(1, 'DEMO-30MIN', 'Demo 30 Minutes', 1800, 1000),
    packageRow(2, 'DEMO-60MIN', 'Demo 60 Minutes', 3600, 1800),
  ];
}

function packageRow(
  index: number,
  code: string,
  name: string,
  duration: number,
  price: number,
) {
  return {
    id: ids.packages[index],
    station_id: ids.station,
    code,
    name,
    duration_seconds: duration,
    price_minor: price,
    currency: 'TZS',
    valid_from: new Date('2026-07-01T00:00:00.000Z'),
    display_order: index + 1,
  };
}

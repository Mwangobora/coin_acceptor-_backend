import type { PrismaClient } from '@prisma/client';

import { ids } from './seed-demo-ids';
import { insertRow } from './seed-utils';

export async function seedDemoEvents(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const row of events())
    count += await insertRow(prisma, 'device_events', row);
  count += await insertRow(prisma, 'device_telemetry', telemetry(0, 'grid'));
  count += await insertRow(
    prisma,
    'device_telemetry',
    telemetry(1, 'backup_battery'),
  );
  return count;
}

function event(
  index: number,
  externalId: string,
  category: string,
  type: string,
) {
  return {
    id: ids.events[index],
    station_id: ids.station,
    device_id: ids.device,
    external_event_id: externalId,
    event_category: category,
    event_type: type,
    sequence_number: index + 1,
    occurred_at: new Date(`2026-07-19T09:0${index}:00.000Z`),
    received_at: new Date(`2026-07-19T09:0${index}:03.000Z`),
    firmware_version: '1.0.0-demo',
    payload: { seed: 'demo', type },
    processing_status: 'processed',
    processed_at: new Date(`2026-07-19T09:0${index}:05.000Z`),
    request_id: `demo-request-${index + 1}`,
  };
}

function events() {
  return [
    event(0, 'DEMO-EVENT-GRID-001', 'telemetry', 'telemetry.grid_power'),
    event(1, 'DEMO-EVENT-BATTERY-001', 'telemetry', 'telemetry.backup_battery'),
    event(2, 'DEMO-EVENT-COIN-001', 'payment', 'payment.coin_accepted'),
    event(3, 'DEMO-EVENT-QR-001', 'payment', 'payment.qr_confirmed'),
    event(4, 'DEMO-EVENT-ALERT-001', 'alert', 'alert.overcurrent_detected'),
  ];
}

function telemetry(index: number, powerSource: 'grid' | 'backup_battery') {
  return {
    id: `00000000-0000-4000-8000-00000000041${index}`,
    device_event_id: ids.events[index],
    station_id: ids.station,
    device_id: ids.device,
    observed_at: new Date(`2026-07-19T09:0${index}:00.000Z`),
    power_source: powerSource,
    grid_available: powerSource === 'grid',
    input_voltage: powerSource === 'grid' ? 230 : 0,
    output_voltage: 5,
    output_current_ma: 1200,
    output_power_watts: 6,
    battery_voltage: powerSource === 'backup_battery' ? 12.4 : null,
    battery_percentage: powerSource === 'backup_battery' ? 62 : 88,
    temperature_celsius: 34.5,
    connectivity_signal_dbm: -67,
    active_session_count: 1,
    available_locker_count: 3,
    metrics: { seed: 'demo' },
  };
}

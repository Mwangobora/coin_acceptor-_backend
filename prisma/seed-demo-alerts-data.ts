import { ids } from './seed-demo-ids';

export function alerts(adminId: string) {
  const now = new Date('2026-07-19T09:40:00.000Z');
  return [
    alert(0, 'LOW_BATTERY_DEMO', 'power', 'warning', 'Low backup battery', now),
    alert(
      1,
      'OVERCURRENT_DEMO',
      'charging_port',
      'critical',
      'Overcurrent detected',
      now,
    ),
    {
      ...alert(
        2,
        'DEVICE_OFFLINE_DEMO',
        'connectivity',
        'warning',
        'Device offline',
        now,
      ),
      status: 'acknowledged',
      acknowledged_at: new Date('2026-07-19T09:45:00.000Z'),
      acknowledged_by_user_id: adminId,
    },
  ];
}

function alert(
  index: number,
  code: string,
  category: string,
  severity: string,
  title: string,
  detectedAt: Date,
) {
  return {
    id: ids.alerts[index],
    station_id: ids.station,
    device_id: ids.device,
    locker_id: index === 1 ? ids.lockers[1] : null,
    charging_port_id: index === 1 ? ids.ports[1] : null,
    device_event_id: index === 1 ? ids.events[4] : null,
    alert_code: code,
    category,
    severity,
    title,
    message: `${title} demo alert.`,
    status: 'open',
    deduplication_key: `demo-${code.toLowerCase()}`,
    detected_at: detectedAt,
    metadata: { seed: 'demo' },
  };
}

import { ids } from './seed-demo-ids';

export function settings() {
  return [
    setting(0, 'pricing.currency', 'global', null, null, 'string', 'TZS'),
    setting(
      1,
      'station.operating-hours',
      'station',
      ids.station,
      null,
      'json',
      {
        open: '06:00',
        close: '22:00',
      },
    ),
    setting(
      2,
      'device.heartbeat-seconds',
      'device',
      ids.station,
      ids.device,
      'integer',
      60,
    ),
    setting(3, 'payments.coin_pulse_mapping', 'global', null, null, 'json', {
      '1': 200,
      '2': 300,
      '5': 500,
    }),
  ];
}

function setting(
  index: number,
  key: string,
  scope: string,
  station: string | null,
  device: string | null,
  type: string,
  value: string | number | object,
) {
  return {
    id: ids.settings[index],
    setting_key: key,
    scope_type: scope,
    station_id: station,
    device_id: device,
    value_type: type,
    value_json: value,
    description: 'Demo seed setting.',
  };
}

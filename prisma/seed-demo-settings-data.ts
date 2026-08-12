import { ids } from './seed-demo-ids';
import {
  COIN_PULSE_MAPPING_SETTING_KEY,
  HARDWARE_CAPABILITIES_SETTING_KEY,
  HARDWARE_PIN_MAP_SETTING_KEY,
  PROTOTYPE_COIN_PULSE_MAPPING,
  PROTOTYPE_HARDWARE_CAPABILITIES,
  PROTOTYPE_HARDWARE_PIN_MAP,
} from '../src/apps/settings/constants/hardware-settings.constants';
import { PUBLIC_QR_SETTING_KEY } from '../src/apps/public-charging/constants/public-charging.constants';

const PUBLIC_QR_TOKEN_HASH =
  'f090b2c1bb4f0b2e0f4c70b8e45112bb6d2af34e54a8692b7b05569a9b8ae08a';

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
      COIN_PULSE_MAPPING_SETTING_KEY,
      'device',
      ids.station,
      ids.device,
      'json',
      PROTOTYPE_COIN_PULSE_MAPPING,
    ),
    setting(
      3,
      HARDWARE_PIN_MAP_SETTING_KEY,
      'device',
      ids.station,
      ids.device,
      'json',
      PROTOTYPE_HARDWARE_PIN_MAP,
    ),
    setting(
      4,
      HARDWARE_CAPABILITIES_SETTING_KEY,
      'device',
      ids.station,
      ids.device,
      'json',
      PROTOTYPE_HARDWARE_CAPABILITIES,
    ),
    setting(5, PUBLIC_QR_SETTING_KEY, 'device', ids.station, ids.device, 'json', {
      hashes: [{ sha256: PUBLIC_QR_TOKEN_HASH, status: 'active' }],
      label: 'Charging machine public QR',
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

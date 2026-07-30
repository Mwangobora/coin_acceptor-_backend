import { ids } from './seed-demo-ids';
import {
  COIN_PULSE_MAPPING_SETTING_KEY,
  HARDWARE_CAPABILITIES_SETTING_KEY,
  HARDWARE_PIN_MAP_SETTING_KEY,
  PROTOTYPE_COIN_PULSE_MAPPING,
  PROTOTYPE_HARDWARE_CAPABILITIES,
  PROTOTYPE_HARDWARE_PIN_MAP,
} from '../src/apps/settings/constants/hardware-settings.constants';

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

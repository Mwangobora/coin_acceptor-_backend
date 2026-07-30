import type {
  CoinPulseMapping,
  HardwareCapabilities,
  HardwarePrototypePinMap,
} from '../types/hardware-settings.types';

export const COIN_PULSE_MAPPING_SETTING_KEY = 'coin.pulse_mapping';
export const HARDWARE_PIN_MAP_SETTING_KEY = 'hardware.prototype.pin_map';
export const HARDWARE_CAPABILITIES_SETTING_KEY =
  'hardware.prototype.capabilities';

export const COIN_SETTLE_WINDOW_MIN_MS = 100;
export const COIN_SETTLE_WINDOW_MAX_MS = 5_000;

export const PROTOTYPE_COIN_PULSE_MAPPING: CoinPulseMapping = {
  currency: 'TZS',
  settleWindowMs: 500,
  entries: [
    { pulseCount: 4, amountMinor: 50, durationSeconds: 20 },
    { pulseCount: 8, amountMinor: 100, durationSeconds: 40 },
    { pulseCount: 12, amountMinor: 200, durationSeconds: 60 },
    { pulseCount: 16, amountMinor: 500, durationSeconds: 120 },
  ],
};

export const PROTOTYPE_HARDWARE_PIN_MAP: HardwarePrototypePinMap = {
  board: 'ESP32',
  coinPin: 12,
  chargingRelays: [
    { slotNumber: 1, gpio: 26, activeLevel: 'LOW' },
    { slotNumber: 2, gpio: 25, activeLevel: 'LOW' },
  ],
  lockerRelays: [
    { lockerNumber: 1, gpio: 33, activeLevel: 'LOW' },
    { lockerNumber: 2, gpio: 32, activeLevel: 'LOW' },
  ],
  keypad: {
    rows: 4,
    columns: 3,
    rowPins: [13, 14, 16, 17],
    columnPins: [18, 19, 23],
  },
  lcd: {
    type: 'i2c',
    address: '0x27',
    columns: 16,
    rows: 2,
  },
};

export const PROTOTYPE_HARDWARE_CAPABILITIES: HardwareCapabilities = {
  lockerCount: 2,
  chargingPortCount: 2,
  supportsCoin: true,
  supportsQr: false,
  supportsKeypad: true,
  supportsLcd: true,
  supportsLocalTimer: true,
  supportsRemoteCommands: false,
  supportsTelemetry: false,
  supportsWifi: false,
  firmwareIntegrationStatus: 'prototype_offline',
};

export const LEGACY_DEMO_LOCKER_IDS = [
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
] as const;

export const LEGACY_DEMO_PORT_IDS = [
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000204',
] as const;

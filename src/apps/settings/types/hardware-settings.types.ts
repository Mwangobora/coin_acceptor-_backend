export type CoinPulseMappingEntry = {
  pulseCount: number;
  amountMinor: number;
  durationSeconds: number;
};

export type CoinPulseMapping = {
  currency: string;
  settleWindowMs: number;
  entries: CoinPulseMappingEntry[];
};

export type CoinPulseResolution = CoinPulseMappingEntry & {
  currency: string;
  settleWindowMs: number;
};

export type RelayChannel = {
  slotNumber?: number;
  lockerNumber?: number;
  gpio: number;
  activeLevel: 'LOW' | 'HIGH';
};

export type HardwarePrototypePinMap = {
  board: string;
  coinPin: number;
  chargingRelays: Array<
    Required<Pick<RelayChannel, 'slotNumber' | 'gpio' | 'activeLevel'>>
  >;
  lockerRelays: Array<
    Required<Pick<RelayChannel, 'lockerNumber' | 'gpio' | 'activeLevel'>>
  >;
  keypad: {
    rows: number;
    columns: number;
    rowPins: number[];
    columnPins: number[];
  };
  lcd: {
    type: string;
    address: string;
    columns: number;
    rows: number;
  };
};

export type HardwareCapabilities = {
  lockerCount: number;
  chargingPortCount: number;
  supportsCoin: boolean;
  supportsQr: boolean;
  supportsKeypad: boolean;
  supportsLcd: boolean;
  supportsLocalTimer: boolean;
  supportsRemoteCommands: boolean;
  supportsTelemetry: boolean;
  supportsWifi: boolean;
  firmwareIntegrationStatus: string;
};

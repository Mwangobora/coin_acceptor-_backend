import { HardwareCapabilitiesMapper } from './hardware-capabilities.mapper';

describe('HardwareCapabilitiesMapper', () => {
  it('maps the prototype capability setting as offline', () => {
    const mapper = new HardwareCapabilitiesMapper();
    expect(
      mapper.fromValue({
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
      }),
    ).toMatchObject({
      lockerCount: 2,
      chargingPortCount: 2,
      supportsQr: false,
      supportsRemoteCommands: false,
      supportsTelemetry: false,
      supportsWifi: false,
      firmwareIntegrationStatus: 'prototype_offline',
    });
  });
});

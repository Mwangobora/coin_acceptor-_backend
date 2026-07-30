import { BadRequestException } from '@nestjs/common';

import { HardwarePrototypePinMapValidator } from './hardware-prototype-pin-map.validator';

describe('HardwarePrototypePinMapValidator', () => {
  const validator = new HardwarePrototypePinMapValidator();

  it('accepts the two-slot prototype pin map', () => {
    expect(
      validator.validate({
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
      }),
    ).toMatchObject({
      coinPin: 12,
      chargingRelays: [{ gpio: 26 }, { gpio: 25 }],
      lockerRelays: [{ gpio: 33 }, { gpio: 32 }],
    });
  });

  it('rejects secret-bearing hardware settings', () => {
    expect(() =>
      validator.validate({
        board: 'ESP32',
        coinPin: 12,
        chargingRelays: [{ slotNumber: 1, gpio: 26, activeLevel: 'LOW' }],
        lockerRelays: [{ lockerNumber: 1, gpio: 33, activeLevel: 'LOW' }],
        keypad: { rows: 1, columns: 1, rowPins: [13], columnPins: [18] },
        lcd: { type: 'i2c', address: '0x27', columns: 16, rows: 2 },
        hmacSecret: 'forbidden',
      }),
    ).toThrow(BadRequestException);
  });
});

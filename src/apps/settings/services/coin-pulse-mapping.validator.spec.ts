import { BadRequestException } from '@nestjs/common';

import { CoinPulseMappingValidator } from './coin-pulse-mapping.validator';

describe('CoinPulseMappingValidator', () => {
  const validator = new CoinPulseMappingValidator();

  it('validates the prototype pulse mapping and resolves entries', () => {
    const mapping = validator.validate({
      currency: 'TZS',
      settleWindowMs: 500,
      entries: [
        { pulseCount: 4, amountMinor: 50, durationSeconds: 20 },
        { pulseCount: 8, amountMinor: 100, durationSeconds: 40 },
        { pulseCount: 12, amountMinor: 200, durationSeconds: 60 },
        { pulseCount: 16, amountMinor: 500, durationSeconds: 120 },
      ],
    });
    expect(mapping.entries.map((entry) => entry.pulseCount)).toEqual([
      4, 8, 12, 16,
    ]);
    expect(validator.resolve(mapping, 4)).toMatchObject({
      amountMinor: 50,
      durationSeconds: 20,
    });
    expect(validator.resolve(mapping, 8)).toMatchObject({
      amountMinor: 100,
      durationSeconds: 40,
    });
    expect(validator.resolve(mapping, 12)).toMatchObject({
      amountMinor: 200,
      durationSeconds: 60,
    });
    expect(validator.resolve(mapping, 16)).toMatchObject({
      amountMinor: 500,
      durationSeconds: 120,
    });
    expect(validator.resolve(mapping, 99)).toBeNull();
  });

  it('rejects duplicate or unsafe pulse mappings', () => {
    expect(() =>
      validator.validate({
        currency: 'TZS',
        settleWindowMs: 50,
        entries: [{ pulseCount: 4, amountMinor: 50, durationSeconds: 20 }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validator.validate({
        currency: 'TZS',
        settleWindowMs: 500,
        entries: [
          { pulseCount: 4, amountMinor: 50, durationSeconds: 20 },
          { pulseCount: 4, amountMinor: 100, durationSeconds: 40 },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});

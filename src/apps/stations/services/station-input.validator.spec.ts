import { BadRequestException } from '@nestjs/common';

import { StationInputValidator } from './station-input.validator';

describe('StationInputValidator', () => {
  const validator = new StationInputValidator();

  it('rejects blank name and region values', () => {
    expect(() => validator.validate({ name: ' ' })).toThrow(
      BadRequestException,
    );
    expect(() => validator.validate({ region: ' ' })).toThrow(
      BadRequestException,
    );
  });

  it('requires coordinate pairs and valid timezones', () => {
    expect(() => validator.validate({ latitude: -6.8 })).toThrow(
      BadRequestException,
    );
    expect(() => validator.validate({ timezone: 'Not/AZone' })).toThrow(
      BadRequestException,
    );
  });

  it('normalizes station codes', () => {
    expect(validator.normalizeCode(' main station ')).toBe('MAIN_STATION');
  });
});

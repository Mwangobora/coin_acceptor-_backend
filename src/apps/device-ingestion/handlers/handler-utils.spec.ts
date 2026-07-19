import { BadRequestException } from '@nestjs/common';

import {
  assertIn,
  booleanValue,
  numberValue,
  objectValue,
  requireOne,
  stringValue,
} from './handler-utils';

describe('handler utils', () => {
  it('extracts typed payload values', () => {
    const payload = { text: 'ok', empty: '', count: 2, flag: true, nested: {} };
    expect(stringValue(payload, 'text')).toBe('ok');
    expect(stringValue(payload, 'empty')).toBeUndefined();
    expect(numberValue(payload, 'count')).toBe(2);
    expect(booleanValue(payload, 'flag')).toBe(true);
    expect(objectValue(payload, 'nested')).toEqual({});
    expect(objectValue(payload, 'missing')).toEqual({});
  });

  it('rejects invalid values', () => {
    expect(() => objectValue({ nested: [] }, 'nested')).toThrow(
      BadRequestException,
    );
    expect(() => requireOne(undefined, 'required')).toThrow(
      BadRequestException,
    );
    expect(() => assertIn('bad', ['ok'])).toThrow(BadRequestException);
  });
});

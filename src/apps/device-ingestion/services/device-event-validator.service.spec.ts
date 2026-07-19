import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DeviceEventValidatorService } from './device-event-validator.service';
import { SensitivePayloadService } from './sensitive-payload.service';

describe('DeviceEventValidatorService', () => {
  const sensitive: Pick<SensitivePayloadService, 'assertSafe'> = {
    assertSafe: jest.fn(),
  };
  const service = new DeviceEventValidatorService(sensitive, {
    getOrThrow: jest.fn().mockReturnValue(300),
  } as unknown as ConfigService);

  beforeEach(() => jest.clearAllMocks());

  it('accepts valid event payloads', () => {
    const occurredAt = new Date(Date.now() - 1000).toISOString();
    expect(service.validate({ occurredAt, payload: {} } as never)).toEqual(
      new Date(occurredAt),
    );
    expect(sensitive.assertSafe).toHaveBeenCalledWith({});
  });

  it('rejects invalid time and payload shapes', () => {
    expect(() =>
      service.validate({ occurredAt: 'bad', payload: {} } as never),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validate({
        occurredAt: new Date(Date.now() + 600_000).toISOString(),
        payload: {},
      } as never),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validate({
        occurredAt: new Date().toISOString(),
        payload: [],
      } as never),
    ).toThrow(BadRequestException);
  });
});

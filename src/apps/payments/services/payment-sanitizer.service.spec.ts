import { BadRequestException } from '@nestjs/common';

import {
  PaymentSanitizerService,
  sanitizeJson,
} from './payment-sanitizer.service';

describe('PaymentSanitizerService', () => {
  const service = new PaymentSanitizerService();

  it('rejects sensitive nested fields and accepts safe payloads', () => {
    expect(() => service.assertSafe({ meta: { pin: '1234' } })).toThrow(
      BadRequestException,
    );
    expect(() => service.assertSafe([{ safe: true }])).not.toThrow();
    expect(() => service.assertSafe(null)).not.toThrow();
  });

  it('drops sensitive JSON fields and normalizes non-objects', () => {
    expect(sanitizeJson({ ok: true, api_key: 'hidden' })).toEqual({ ok: true });
    expect(sanitizeJson(['nope'])).toEqual({});
    expect(sanitizeJson('nope')).toEqual({});
  });
});

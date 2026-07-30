import { BadRequestException } from '@nestjs/common';

import { HardwareEventContractValidator } from './hardware-event-contract.validator';

describe('HardwareEventContractValidator', () => {
  const validator = new HardwareEventContractValidator();

  it('accepts the coin inserted contract payload', () => {
    expect(() =>
      validator.validate({
        eventType: 'payment.coin_inserted',
        payload: {
          paymentReference: 'PAY-001',
          pulseCount: 4,
          insertedAt: '2026-07-30T10:00:00.000Z',
        },
      } as never),
    ).not.toThrow();
  });

  it('rejects malformed contract payloads', () => {
    expect(() =>
      validator.validate({
        eventType: 'payment.coin_inserted',
        payload: { paymentReference: 'PAY-001', pulseCount: 0 },
      } as never),
    ).toThrow(BadRequestException);
  });
});

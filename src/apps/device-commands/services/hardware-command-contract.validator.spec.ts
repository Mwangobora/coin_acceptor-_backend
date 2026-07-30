import { BadRequestException } from '@nestjs/common';

import { HardwareCommandContractValidator } from './hardware-command-contract.validator';

describe('HardwareCommandContractValidator', () => {
  const validator = new HardwareCommandContractValidator();

  it('accepts the prototype charging start payload', () => {
    expect(() =>
      validator.validate('charging.start', {
        sessionReference: 'SESSION-001',
        lockerNumber: 1,
        portNumber: 1,
        durationSeconds: 20,
      }),
    ).not.toThrow();
  });

  it('rejects missing hardware identity and locker codes', () => {
    expect(() =>
      validator.validate('charging.start', {
        sessionReference: 'SESSION-001',
        portNumber: 1,
        durationSeconds: 20,
      }),
    ).toThrow(BadRequestException);
  });
});

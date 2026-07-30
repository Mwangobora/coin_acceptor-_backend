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

  it('accepts public charging prepare verifier payloads', () => {
    expect(() =>
      validator.validate('charging.prepare', {
        sessionReference: 'SESSION-001',
        lockerNumber: 1,
        portNumber: 1,
        durationSeconds: 120,
        accessCodeVerifier: `hmac-sha256:${'a'.repeat(64)}`,
      }),
    ).not.toThrow();
  });

  it('rejects prepare payloads without verifier', () => {
    expect(() =>
      validator.validate('charging.prepare', {
        sessionReference: 'SESSION-001',
        lockerNumber: 1,
        portNumber: 1,
        durationSeconds: 120,
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts locker and stop commands with valid identities', () => {
    expect(() =>
      validator.validate('locker.open', { lockerNumber: 1 }),
    ).not.toThrow();
    expect(() =>
      validator.validate('charging.stop', { sessionReference: 'SESSION-001' }),
    ).not.toThrow();
    expect(() =>
      validator.validate('charging.stop', {
        lockerNumber: 1,
        portNumber: 1,
      }),
    ).not.toThrow();
  });
});

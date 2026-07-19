import { BadRequestException, ConflictException } from '@nestjs/common';

import { CredentialRotationPolicy } from './credential-rotation.policy';

describe('CredentialRotationPolicy', () => {
  const policy = new CredentialRotationPolicy();

  it('requires active credentials for rotation', () => {
    expect(() =>
      policy.validateActive({
        status: 'revoked',
        revoked_at: new Date(),
      } as never),
    ).toThrow(ConflictException);
  });

  it('validates expiry and device lifecycle', () => {
    expect(() =>
      policy.validateExpiry('2026-01-01', new Date('2026-01-02')),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.validateDeviceAllowsCreation({
        lifecycle_status: 'disabled',
      } as never),
    ).toThrow(BadRequestException);
  });

  it('protects the final active credential unless forced', () => {
    expect(() =>
      policy.validateFinalActiveRevoke({
        device: { lifecycle_status: 'active' } as never,
        activeCount: 1,
      }),
    ).toThrow(ConflictException);
  });
});

import { BadRequestException } from '@nestjs/common';

import { CertificateValidationService } from './certificate-validation.service';

describe('CertificateValidationService', () => {
  const service = new CertificateValidationService();

  it('rejects missing material and private keys', () => {
    expect(() => service.validate({})).toThrow(BadRequestException);
    expect(() =>
      service.validate({ publicKeyPem: '-----BEGIN PRIVATE KEY-----' }),
    ).toThrow(BadRequestException);
  });

  it('normalizes supplied fingerprints', () => {
    expect(
      service.validate({ certificateFingerprint: 'aa:bb cc' })
        .certificateFingerprint,
    ).toBe('AABBCC');
  });

  it('accepts public key PEM and derives a fingerprint', () => {
    const result = service.validate({
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
    });

    expect(result.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(result.certificateFingerprint).toHaveLength(64);
  });

  it('rejects malformed public key PEM', () => {
    expect(() =>
      service.validate({ publicKeyPem: '-----BEGIN PUBLIC KEY-----' }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validate({ publicKeyPem: '-----END PUBLIC KEY-----' }),
    ).toThrow(BadRequestException);
  });
});

import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class CertificateValidationService {
  validate(input: { publicKeyPem?: string; certificateFingerprint?: string }) {
    if (!input.publicKeyPem && !input.certificateFingerprint) {
      throw new BadRequestException(
        'Certificate credentials require public key material.',
      );
    }
    if (input.publicKeyPem) this.validatePem(input.publicKeyPem);
    return {
      publicKeyPem: input.publicKeyPem,
      certificateFingerprint:
        input.certificateFingerprint
          ?.replace(/[^a-fA-F0-9]/g, '')
          .toUpperCase() ?? fingerprint(input.publicKeyPem ?? ''),
    };
  }

  private validatePem(pem: string): void {
    if (/PRIVATE KEY/.test(pem)) {
      throw new BadRequestException('Private keys are not accepted.');
    }
    if (!/-----BEGIN (PUBLIC KEY|CERTIFICATE)-----/.test(pem)) {
      throw new BadRequestException('Invalid public key PEM.');
    }
    if (!/-----END (PUBLIC KEY|CERTIFICATE)-----/.test(pem)) {
      throw new BadRequestException('Invalid public key PEM.');
    }
  }
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

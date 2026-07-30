import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { DeviceSecretEncryptionService } from '../../device-credentials/services/device-secret-encryption.service';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AccessCodeVerifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: DeviceSecretEncryptionService,
  ) {}

  async verifier(input: {
    deviceId: string;
    sessionReference: string;
    lockerNumber: number;
    pin: string;
  }): Promise<string> {
    const credential = await this.prisma.device_credentials.findFirst({
      where: {
        device_id: input.deviceId,
        credential_type: 'hmac',
        status: 'active',
        revoked_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { valid_from: 'desc' },
    });
    if (!credential?.secret_encrypted) {
      throw new ServiceUnavailableException('Device verifier is unavailable.');
    }
    let secret = '';
    try {
      secret = this.encryption.decrypt(credential.secret_encrypted);
      const digest = createHmac('sha256', secret)
        .update(canonicalInput(input))
        .digest('hex');
      return `hmac-sha256:${digest}`;
    } finally {
      if (secret) Buffer.from(secret).fill(0);
    }
  }
}

export function canonicalInput(input: {
  sessionReference: string;
  lockerNumber: number;
  pin: string;
}): string {
  return [input.sessionReference, input.lockerNumber, input.pin].join(':');
}

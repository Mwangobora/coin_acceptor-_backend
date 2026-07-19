import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { device_credentials, devices } from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedDevice } from '../types/authenticated-device.type';

type Credential = device_credentials & { devices: devices };

@Injectable()
export class DeviceApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(header?: string): Promise<AuthenticatedDevice> {
    const parsed = this.parse(header);
    if (!parsed) this.reject();
    const credential = await this.findCredential(parsed.keyId);
    if (!credential || !credential.secret_hash) this.reject();
    if (!(await argon2.verify(credential.secret_hash, parsed.secret))) {
      this.reject();
    }
    await this.markUsed(credential.id);
    return this.context(credential);
  }

  private parse(header?: string) {
    const match = header?.match(/^DeviceApiKey\s+([^.\s]+)\.([^.\s]+)$/);
    return match ? { keyId: match[1], secret: match[2] } : undefined;
  }

  private findCredential(keyId: string): Promise<Credential | null> {
    const now = new Date();
    return this.prisma.device_credentials.findFirst({
      where: {
        key_id: keyId,
        credential_type: 'api_key',
        status: 'active',
        revoked_at: null,
        valid_from: { lte: now },
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
      include: { devices: true },
    });
  }

  private markUsed(id: string): Promise<device_credentials> {
    return this.prisma.device_credentials.update({
      where: { id },
      data: { last_used_at: new Date() },
    });
  }

  private context(credential: Credential): AuthenticatedDevice {
    return {
      deviceId: credential.device_id,
      stationId: credential.devices.station_id,
      credentialId: credential.id,
      keyId: credential.key_id,
      credentialType: 'api_key',
    };
  }

  private reject(): never {
    throw new UnauthorizedException('Device authentication failed.');
  }
}

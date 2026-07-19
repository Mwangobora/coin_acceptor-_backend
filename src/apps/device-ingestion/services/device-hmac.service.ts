import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { device_credentials, devices } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { DeviceSecretEncryptionService } from '../../device-credentials/services/device-secret-encryption.service';
import { PrismaService } from '../../../database/prisma.service';
import type {
  AuthenticatedDevice,
  DeviceAuthRequest,
} from '../types/authenticated-device.type';
import { DeviceReplayProtectionService } from './device-replay-protection.service';

type Credential = device_credentials & { devices: devices };

@Injectable()
export class DeviceHmacService {
  private readonly clockSkewSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: DeviceSecretEncryptionService,
    private readonly replay: DeviceReplayProtectionService,
    config: ConfigService,
  ) {
    this.clockSkewSeconds = config.getOrThrow<number>(
      'security.deviceHmacClockSkewSeconds',
    );
  }

  async authenticate(request: DeviceAuthRequest): Promise<AuthenticatedDevice> {
    const keyId = this.header(request, 'x-device-key-id');
    const timestamp = this.header(request, 'x-device-timestamp');
    const nonce = this.header(request, 'x-device-nonce');
    const signature = this.header(request, 'x-device-signature');
    if (!keyId || !timestamp || !nonce || !signature) this.reject();
    this.validateTimestamp(timestamp);
    const credential = await this.findCredential(keyId);
    if (!credential?.secret_encrypted) this.reject();
    await this.reserveNonce(credential.id, nonce);
    this.verifySignature(request, credential.secret_encrypted, signature, {
      timestamp,
      nonce,
    });
    await this.markUsed(credential.id);
    return this.context(credential);
  }

  private header(request: DeviceAuthRequest, name: string): string | undefined {
    const value = request.header(name);
    return value?.trim() || undefined;
  }

  private validateTimestamp(value: string): void {
    const time = Date.parse(value);
    const skewMs = this.clockSkewSeconds * 1000;
    if (!Number.isFinite(time) || Math.abs(Date.now() - time) > skewMs) {
      this.reject();
    }
  }

  private findCredential(keyId: string): Promise<Credential | null> {
    const now = new Date();
    return this.prisma.device_credentials.findFirst({
      where: {
        key_id: keyId,
        credential_type: 'hmac',
        status: 'active',
        revoked_at: null,
        valid_from: { lte: now },
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
      include: { devices: true },
    });
  }

  private async reserveNonce(id: string, nonce: string): Promise<void> {
    const reserved = await this.replay
      .reserveNonce(id, nonce, this.clockSkewSeconds)
      .catch(() => false);
    if (!reserved) {
      this.reject();
    }
  }

  private verifySignature(
    request: DeviceAuthRequest,
    encryptedSecret: string,
    signature: string,
    input: { timestamp: string; nonce: string },
  ): void {
    let secret = '';
    try {
      secret = this.encryption.decrypt(encryptedSecret);
      const expected = this.sign(secret, this.canonical(request, input));
      if (!sameHex(expected, signature)) this.reject();
    } catch {
      this.reject();
    } finally {
      if (secret) Buffer.from(secret).fill(0);
    }
  }

  private canonical(
    request: DeviceAuthRequest,
    input: { timestamp: string; nonce: string },
  ): string {
    return [
      request.method.toUpperCase(),
      request.originalUrl.split('?')[0],
      input.timestamp,
      input.nonce,
      createHash('sha256')
        .update(request.rawBody ?? Buffer.alloc(0))
        .digest('hex'),
    ].join('\n');
  }

  private sign(secret: string, canonical: string): string {
    return createHmac('sha256', secret).update(canonical).digest('hex');
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
      credentialType: 'hmac',
    };
  }

  private reject(): never {
    throw new UnauthorizedException('Device authentication failed.');
  }
}

function sameHex(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

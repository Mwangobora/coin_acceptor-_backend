import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  AuthenticatedDevice,
  DeviceAuthRequest,
} from '../types/authenticated-device.type';
import { PrismaService } from '../../../database/prisma.service';
import { DeviceApiKeyService } from './device-api-key.service';
import { DeviceHmacService } from './device-hmac.service';

@Injectable()
export class DeviceAuthService {
  constructor(
    private readonly apiKeys: DeviceApiKeyService,
    private readonly hmac: DeviceHmacService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  authenticate(request: DeviceAuthRequest): Promise<AuthenticatedDevice> {
    if (!this.config.get<boolean>('security.deviceAuthEnabled')) {
      return this.testDeviceContext(request);
    }
    if (request.header('authorization')?.startsWith('DeviceApiKey ')) {
      return this.apiKeys.authenticate(request.header('authorization'));
    }
    if (request.header('x-device-key-id')) {
      return this.hmac.authenticate(request);
    }
    throw new UnauthorizedException('Device authentication failed.');
  }

  private async testDeviceContext(
    request: DeviceAuthRequest,
  ): Promise<AuthenticatedDevice> {
    const deviceId = request.header('x-device-id');
    const device = await this.prisma.devices.findFirst({
      where: {
        ...(deviceId ? { id: deviceId } : {}),
        lifecycle_status: { not: 'decommissioned' },
      },
      orderBy: { created_at: 'asc' },
      select: { id: true, station_id: true },
    });
    if (!device) throw new UnauthorizedException('Device not found.');
    return {
      deviceId: device.id,
      stationId: device.station_id,
      credentialId: 'test-mode',
      keyId: 'test-mode',
      credentialType: 'api_key',
    };
  }
}

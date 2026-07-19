import { Injectable, UnauthorizedException } from '@nestjs/common';

import type {
  AuthenticatedDevice,
  DeviceAuthRequest,
} from '../types/authenticated-device.type';
import { DeviceApiKeyService } from './device-api-key.service';
import { DeviceHmacService } from './device-hmac.service';

@Injectable()
export class DeviceAuthService {
  constructor(
    private readonly apiKeys: DeviceApiKeyService,
    private readonly hmac: DeviceHmacService,
  ) {}

  authenticate(request: DeviceAuthRequest): Promise<AuthenticatedDevice> {
    if (request.header('authorization')?.startsWith('DeviceApiKey ')) {
      return this.apiKeys.authenticate(request.header('authorization'));
    }
    if (request.header('x-device-key-id')) {
      return this.hmac.authenticate(request);
    }
    throw new UnauthorizedException('Device authentication failed.');
  }
}

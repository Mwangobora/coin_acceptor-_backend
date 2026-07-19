import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { DeviceAuthRequest } from '../types/authenticated-device.type';
import { DeviceAuthService } from '../services/device-auth.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly auth: DeviceAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceAuthRequest>();
    request.deviceAuth = await this.auth.authenticate(request);
    return true;
  }
}

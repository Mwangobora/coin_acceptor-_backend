import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthRequest } from '../../auth/types/auth-request.type';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const stationId = this.stationIdFromRequest(request);
    for (const code of required) {
      if (
        !(await this.permissions.hasPermission(
          request.user.id,
          code,
          stationId,
        )) &&
        !(
          !stationId &&
          allowsDeferredStationScope(code) &&
          (await this.permissions.hasAnyScopePermission(request.user.id, code))
        )
      ) {
        throw new ForbiddenException('Missing required permission.');
      }
    }
    return true;
  }

  private stationIdFromRequest(request: AuthRequest): string | undefined {
    const source = {
      ...(request.query as Record<string, unknown>),
      ...(request.body as Record<string, unknown>),
      ...(request.params as Record<string, unknown>),
    };
    return typeof source.stationId === 'string' ? source.stationId : undefined;
  }
}

function allowsDeferredStationScope(code: string): boolean {
  return [
    'stations.read',
    'stations.update',
    'stations.deactivate',
    'devices.read',
    'devices.update',
    'devices.configure',
    'devices.restart',
    'devices.disable',
    'device_commands.read',
    'device_commands.create',
    'device_commands.cancel',
    'device_credentials.read',
    'device_credentials.create',
    'device_credentials.rotate',
    'device_credentials.revoke',
    'device_credentials.force_revoke',
    'device_events.read',
    'device_telemetry.read',
    'lockers.read',
    'lockers.configure',
    'charging_ports.read',
    'charging_ports.configure',
    'payments.refund',
  ].includes(code);
}

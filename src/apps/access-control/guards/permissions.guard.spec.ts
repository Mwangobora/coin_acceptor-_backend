import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  function context(stationId?: string) {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1' },
          query: {},
          body: stationId ? { stationId } : {},
          params: {},
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows requests when all permissions are present', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => ['users.read'] } as unknown as Reflector,
      { hasPermission: jest.fn().mockResolvedValue(true) } as never,
    );

    await expect(guard.canActivate(context('station-1'))).resolves.toBe(true);
  });

  it('rejects missing permissions', async () => {
    const guard = new PermissionsGuard(
      { getAllAndOverride: () => ['users.read'] } as unknown as Reflector,
      { hasPermission: jest.fn().mockResolvedValue(false) } as never,
    );

    await expect(guard.canActivate(context())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows routes with no permission metadata', async () => {
    const guard = new PermissionsGuard(
      {
        getAllAndOverride: (key: string) =>
          key === REQUIRED_PERMISSIONS_KEY ? [] : undefined,
      } as unknown as Reflector,
      { hasPermission: jest.fn() } as never,
    );

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });
});

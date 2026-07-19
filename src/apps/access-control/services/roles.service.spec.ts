import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { RolesService } from './roles.service';

describe('RolesService', () => {
  it('rejects duplicate permission IDs during sync', async () => {
    const service = new RolesService(
      {
        roles: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      } as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.syncPermissions(
        'role-1',
        { permissionIds: ['permission-1', 'permission-1'] },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects unknown permission IDs during sync', async () => {
    const service = new RolesService(
      {
        roles: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
        permissions: { findMany: jest.fn().mockResolvedValue([]) },
      } as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.syncPermissions(
        'role-1',
        { permissionIds: ['permission-1'] },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('protects system roles from deactivation', async () => {
    const service = new RolesService(
      {
        roles: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'role-1',
            code: 'system_admin',
            is_system_role: true,
          }),
        },
      } as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.updateStatus(
        'role-1',
        { status: 'inactive', reason: 'test' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires a reason when deactivating roles', async () => {
    const service = new RolesService(
      {
        roles: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'role-1',
            code: 'custom',
            is_system_role: false,
          }),
        },
      } as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.updateStatus(
        'role-1',
        { status: 'inactive' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists roles with optional filters', async () => {
    const service = new RolesService(
      {
        $transaction: jest.fn().mockResolvedValue([[], 0]),
        roles: { findMany: jest.fn(), count: jest.fn() },
      } as never,
      { record: jest.fn() } as never,
    );

    await service.list({
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      search: 'admin',
      status: 'active',
    });
  });

  it('updates role status when allowed', async () => {
    const role = {
      id: 'role-1',
      code: 'custom',
      name: 'Custom',
      description: null,
      is_system_role: false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const service = new RolesService(
      {
        roles: {
          findUnique: jest.fn().mockResolvedValue(role),
          update: jest.fn().mockResolvedValue({ ...role, status: 'inactive' }),
        },
      } as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.updateStatus(
        'role-1',
        { status: 'inactive', reason: 'test' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).resolves.toEqual(expect.objectContaining({ status: 'inactive' }));
  });
});

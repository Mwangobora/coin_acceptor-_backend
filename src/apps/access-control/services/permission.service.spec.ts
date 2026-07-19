import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  it('returns true when a permission assignment exists', async () => {
    const service = new PermissionService({
      user_role_assignments: { count: jest.fn().mockResolvedValue(1) },
    } as never);

    await expect(service.hasPermission('user-1', 'users.read')).resolves.toBe(
      true,
    );
  });

  it('checks that actors can grant only permissions they possess', async () => {
    const service = new PermissionService({
      role_permissions: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { permissions: { code: 'users.read' } },
            { permissions: { code: 'roles.manage' } },
          ]),
      },
    } as never);
    jest.spyOn(service, 'getPermissionCodes').mockResolvedValue(['users.read']);

    await expect(service.canGrantRole('actor-1', 'role-1')).resolves.toBe(
      false,
    );
  });

  it('detects the last active global super-admin user', async () => {
    const count = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    const service = new PermissionService({
      user_role_assignments: { count },
    } as never);

    await expect(
      service.isLastActiveGlobalSuperAdminUser('user-1'),
    ).resolves.toBe(true);
  });

  it('ignores non-super-admin assignments in last-super-admin checks', async () => {
    const service = new PermissionService({
      user_role_assignments: {
        findUnique: jest.fn().mockResolvedValue({
          station_id: null,
          revoked_at: null,
          roles: { code: 'operator' },
          users_user_role_assignments_user_idTousers: { status: 'active' },
        }),
      },
    } as never);

    await expect(
      service.isLastActiveGlobalSuperAdminAssignment('assignment-1'),
    ).resolves.toBe(false);
  });
});

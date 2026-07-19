import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { RoleAssignmentsService } from './role-assignments.service';

describe('RoleAssignmentsService', () => {
  it('rejects expired assignment requests', async () => {
    const service = new RoleAssignmentsService(
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        'user-1',
        { roleId: 'role-1', expiresAt: '2020-01-01T00:00:00.000Z' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('protects the last global super-admin assignment', async () => {
    const service = new RoleAssignmentsService(
      {} as never,
      {
        isLastActiveGlobalSuperAdminAssignment: jest
          .fn()
          .mockResolvedValue(true),
      } as never,
      {} as never,
    );

    await expect(
      service.revoke(
        'user-1',
        'assignment-1',
        { reason: 'test' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires a revocation reason', async () => {
    const service = new RoleAssignmentsService(
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.revoke(
        'user-1',
        'assignment-1',
        { reason: '' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects assignment when the target user is inactive', async () => {
    const service = new RoleAssignmentsService(
      {
        users: {
          findUnique: jest.fn().mockResolvedValue({ status: 'inactive' }),
        },
        roles: {
          findUnique: jest.fn().mockResolvedValue({ status: 'active' }),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create(
        'user-1',
        { roleId: 'role-1' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { UsersService } from './users.service';

describe('UsersService', () => {
  const user = {
    id: 'user-1',
    full_name: 'User One',
    email: 'u@example.com',
    phone_number: null,
    status: 'active',
    must_change_password: false,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    created_by_user_id: null,
  };

  it('does not allow an actor to restrict themselves', async () => {
    const service = new UsersService(
      { users: { findUnique: jest.fn().mockResolvedValue(user) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateStatus(
        'user-1',
        { status: 'inactive', reason: 'test' },
        { id: 'user-1' } as never,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates users with a hashed temporary password', async () => {
    const create = jest.fn().mockResolvedValue(user);
    const hash = jest.fn().mockResolvedValue('hashed-password');
    const service = new UsersService(
      { users: { create } } as never,
      { hash } as never,
      {} as never,
      {} as never,
      { record: jest.fn() } as never,
    );

    await service.create(
      {
        fullName: 'User One',
        email: 'U@EXAMPLE.COM',
        temporaryPassword: 'Temporary123!',
      },
      { id: 'actor-1' } as never,
      {},
    );

    expect(hash).toHaveBeenCalledWith('Temporary123!');
    const calls = create.mock.calls as unknown as Array<
      [{ data: { email: string } }]
    >;
    const call = calls[0][0];
    expect(call.data.email).toBe('u@example.com');
  });

  it('requires a reason for restrictive status changes', async () => {
    const service = new UsersService(
      { users: { findUnique: jest.fn().mockResolvedValue(user) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateStatus(
        'user-1',
        { status: 'inactive' },
        { id: 'actor-1' } as never,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('revokes sessions after restrictive status changes', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ ...user, status: 'suspended' });
    const revokeUserSessions = jest.fn();
    const service = new UsersService(
      {
        users: { findUnique: jest.fn().mockResolvedValue(user), update },
      } as never,
      {} as never,
      { revokeUserSessions } as never,
      {
        isLastActiveGlobalSuperAdminUser: jest.fn().mockResolvedValue(false),
      } as never,
      { record: jest.fn() } as never,
    );

    await service.updateStatus(
      'user-1',
      { status: 'suspended', reason: 'test' },
      { id: 'actor-1' } as never,
      {},
    );

    expect(revokeUserSessions).toHaveBeenCalledWith('user-1', 'user_suspended');
  });

  it('lists users with optional filters', async () => {
    const service = new UsersService(
      {
        $transaction: jest.fn().mockResolvedValue([[user], 1]),
        users: { findMany: jest.fn(), count: jest.fn() },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.list({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      sortBy: 'email',
      search: 'user',
      status: 'active',
      roleId: '00000000-0000-0000-0000-000000000001',
      stationId: '00000000-0000-0000-0000-000000000002',
    });

    expect(result.items[0].email).toBe('u@example.com');
  });

  it('lists users without optional filters', async () => {
    const service = new UsersService(
      {
        $transaction: jest.fn().mockResolvedValue([[], 0]),
        users: { findMany: jest.fn(), count: jest.fn() },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.list({ page: 1, pageSize: 20, sortOrder: 'asc' });
  });
});

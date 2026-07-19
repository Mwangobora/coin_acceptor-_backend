import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  it('lists permissions with all supported filters', async () => {
    const transaction = jest.fn().mockResolvedValue([[], 0]);
    const service = new PermissionsService({
      $transaction: transaction,
      permissions: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as never);

    const result = await service.list({
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      module: 'users',
      action: 'read',
      search: 'user',
    });

    expect(result.pagination.totalItems).toBe(0);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('lists permissions without optional filters', async () => {
    const service = new PermissionsService({
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      permissions: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as never);

    await expect(
      service.list({ page: 1, pageSize: 20, sortOrder: 'asc' }),
    ).resolves.toEqual({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  });
});

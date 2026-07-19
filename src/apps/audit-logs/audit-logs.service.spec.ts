import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('records append-only audit entries through Prisma', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditLogsService({
      audit_logs: { create },
    } as never);

    await service.record({
      actorUserId: 'user-1',
      action: 'users.created',
      entityType: 'users',
      entityId: 'user-2',
      metadata: { changed: true },
    });

    const calls = create.mock.calls as unknown as Array<
      [{ data: { actor_type: string; action: string; metadata: unknown } }]
    >;
    const call = calls[0][0];
    expect(call.data.actor_type).toBe('user');
    expect(call.data.action).toBe('users.created');
    expect(call.data.metadata).toEqual({ changed: true });
  });

  it('lists audit logs with filters and pagination metadata', async () => {
    const service = new AuditLogsService({
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      audit_logs: { findMany: jest.fn(), count: jest.fn() },
    } as never);

    await expect(
      service.list({
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
        actorUserId: '00000000-0000-0000-0000-000000000001',
        stationId: '00000000-0000-0000-0000-000000000002',
        action: 'users.created',
        entityType: 'users',
        entityId: '00000000-0000-0000-0000-000000000003',
        occurredFrom: '2026-01-01T00:00:00.000Z',
        occurredTo: '2026-01-02T00:00:00.000Z',
      }),
    ).resolves.toEqual({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it('lists audit logs without optional filters', async () => {
    const service = new AuditLogsService({
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      audit_logs: { findMany: jest.fn(), count: jest.fn() },
    } as never);

    await service.list({ page: 1, pageSize: 20, sortOrder: 'asc' });
  });
});

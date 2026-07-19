import { StationsService } from './stations.service';

describe('StationsService', () => {
  it('delegates station operations to focused services', async () => {
    const reads = { list: jest.fn(), get: jest.fn() };
    const writes = { create: jest.fn(), update: jest.fn() };
    const statuses = { updateStatus: jest.fn() };
    const service = new StationsService(
      reads as never,
      writes as never,
      statuses as never,
    );
    const actor = { id: 'user-1' } as never;

    await service.list({ page: 1, pageSize: 20 } as never, actor);
    await service.create({ code: 'S1' } as never, actor, {});
    await service.get('station-1', actor);
    await service.update('station-1', { name: 'Station' }, actor, {});
    await service.updateStatus('station-1', { status: 'active' }, actor, {});

    expect(reads.list).toHaveBeenCalled();
    expect(writes.create).toHaveBeenCalled();
    expect(reads.get).toHaveBeenCalled();
    expect(writes.update).toHaveBeenCalled();
    expect(statuses.updateStatus).toHaveBeenCalled();
  });
});

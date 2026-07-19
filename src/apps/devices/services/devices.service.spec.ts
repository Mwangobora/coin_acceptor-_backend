import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  it('delegates device operations to focused services', async () => {
    const reads = {
      list: jest.fn(),
      listForStation: jest.fn(),
      get: jest.fn(),
    };
    const writes = { create: jest.fn(), update: jest.fn() };
    const lifecycles = { updateLifecycle: jest.fn() };
    const service = new DevicesService(
      reads as never,
      writes as never,
      lifecycles as never,
    );
    const actor = { id: 'user-1' } as never;

    await service.list({ page: 1, pageSize: 20 } as never, actor);
    await service.listForStation('station-1', {} as never, actor);
    await service.create({ deviceCode: 'D1' } as never, actor, {});
    await service.get('device-1', actor);
    await service.update('device-1', { name: 'Device' }, actor, {});
    await service.updateLifecycle(
      'device-1',
      { lifecycleStatus: 'active' },
      actor,
      {},
    );

    expect(reads.list).toHaveBeenCalled();
    expect(reads.listForStation).toHaveBeenCalled();
    expect(writes.create).toHaveBeenCalled();
    expect(reads.get).toHaveBeenCalled();
    expect(writes.update).toHaveBeenCalled();
    expect(lifecycles.updateLifecycle).toHaveBeenCalled();
  });
});

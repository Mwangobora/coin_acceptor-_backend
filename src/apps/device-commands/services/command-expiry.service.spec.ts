import { CommandExpiryService } from './command-expiry.service';

describe('CommandExpiryService', () => {
  it('expires queued or sent commands in a locked batch', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'command-1' }]),
      device_commands: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transaction = jest.fn((fn: (client: typeof tx) => Promise<number>) =>
      fn(tx),
    );
    const prisma = { $transaction: transaction };
    const service = new CommandExpiryService(
      prisma as never,
      { get: jest.fn().mockReturnValue(60) } as never,
    );
    await expect(service.expireBatch()).resolves.toBe(1);
    const updateMany = tx.device_commands.updateMany as jest.MockedFunction<
      (args: UpdateManyArgs) => unknown
    >;
    const call = updateMany.mock.calls[0]?.[0];
    expect(call?.data.status).toBe('expired');
  });

  it('handles empty batches and production scheduling', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device_commands: { updateMany: jest.fn() },
    };
    const transaction = jest.fn((fn: (client: typeof tx) => Promise<number>) =>
      fn(tx),
    );
    const service = new CommandExpiryService(
      { $transaction: transaction } as never,
      { get: jest.fn().mockReturnValue(60) } as never,
    );
    await expect(service.expireBatch()).resolves.toBe(0);

    const originalEnv = process.env.NODE_ENV;
    const interval = { unref: jest.fn() };
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue(interval as never);
    const clearSpy = jest.spyOn(global, 'clearInterval').mockImplementation();
    process.env.NODE_ENV = 'development';
    service.onModuleInit();
    service.onModuleDestroy();
    expect(interval.unref).toHaveBeenCalled();
    process.env.NODE_ENV = originalEnv;
    setIntervalSpy.mockRestore();
    clearSpy.mockRestore();
  });
});

type UpdateManyArgs = { data: { status?: string } };

import { CommandPollingService } from './command-polling.service';

describe('CommandPollingService', () => {
  it('claims queued commands for the authenticated device', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'command-1' }]),
      device_commands: {
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([command()]),
      },
    };
    const transaction = jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    );
    const prisma = { $transaction: transaction };
    const service = new CommandPollingService(
      prisma as never,
      { get: jest.fn().mockReturnValue(5) } as never,
    );
    await expect(service.poll(auth())).resolves.toMatchObject({
      commands: [{ id: 'command-1' }],
    });
    const updateMany = tx.device_commands.updateMany as jest.MockedFunction<
      (args: UpdateManyArgs) => unknown
    >;
    const call = updateMany.mock.calls[0]?.[0];
    expect(call?.where.device_id).toBe('device-1');
  });

  it('returns no commands when no rows are eligible', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device_commands: { updateMany: jest.fn(), findMany: jest.fn() },
    };
    const transaction = jest.fn((fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    );
    const service = new CommandPollingService(
      { $transaction: transaction } as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );
    await expect(service.poll(auth())).resolves.toEqual({ commands: [] });
    expect(tx.device_commands.updateMany).not.toHaveBeenCalled();
  });
});

function auth() {
  return { deviceId: 'device-1', stationId: 'station-1' } as never;
}

function command() {
  return {
    id: 'command-1',
    command_type: 'device.status_request',
    payload: {},
    requested_at: new Date(),
    expires_at: null,
  };
}

type UpdateManyArgs = { where: { device_id?: string } };

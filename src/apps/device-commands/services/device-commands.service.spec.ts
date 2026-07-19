import { ConflictException, ForbiddenException } from '@nestjs/common';

import { CommandIdempotencyService } from './command-idempotency.service';
import { CommandPayloadValidatorRegistry } from './command-payload-validator-registry';
import { CommandQueryBuilder } from './command-query.builder';
import { CommandRequirementsPolicy } from './command-requirements.policy';
import { CommandTransitionPolicy } from './command-transition.policy';
import { DeviceCommandsService } from './device-commands.service';

describe('DeviceCommandsService', () => {
  it('creates commands and returns identical idempotent repeats', async () => {
    const deps = depsMock();
    const service = makeService(deps);
    const dto = dtoMock();
    await expect(
      service.create('device-1', dto, actor(), {}),
    ).resolves.toMatchObject({
      commandType: 'device.status_request',
    });
    deps.prisma.device_commands.findUnique.mockResolvedValue(commandMock());
    await expect(
      service.create('device-1', dto, actor(), {}),
    ).resolves.toMatchObject({
      id: 'command-1',
    });
  });

  it('rejects conflicting idempotency and completed cancellation', async () => {
    const deps = depsMock();
    deps.prisma.device_commands.findUnique.mockResolvedValue(
      commandMock({ command_type: 'device.restart' }),
    );
    const service = makeService(deps);
    await expect(
      service.create('device-1', dtoMock(), actor(), {}),
    ).rejects.toThrow(ConflictException);
    deps.prisma.device_commands.findUnique.mockResolvedValue(
      commandMock({ status: 'completed' }),
    );
    await expect(
      service.cancel('command-1', 'no', actor(), {}),
    ).rejects.toThrow(ConflictException);
  });

  it('requires command-specific permissions', async () => {
    const deps = depsMock();
    deps.permissions.hasPermission.mockResolvedValue(false);
    const service = makeService(deps);
    await expect(
      service.create(
        'device-1',
        { ...dtoMock(), commandType: 'device.restart' },
        actor(),
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

function makeService(deps: ReturnType<typeof depsMock>) {
  return new DeviceCommandsService(
    deps.prisma as never,
    deps.scope as never,
    deps.permissions as never,
    deps.audit as never,
    deps.validators as unknown as CommandPayloadValidatorRegistry,
    new CommandTransitionPolicy(),
    new CommandIdempotencyService(),
    deps.queries as unknown as CommandQueryBuilder,
    new CommandRequirementsPolicy(),
  );
}

function depsMock() {
  return {
    prisma: {
      devices: { findUnique: jest.fn().mockResolvedValue(deviceMock()) },
      device_commands: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(commandMock()),
        update: jest
          .fn()
          .mockResolvedValue(commandMock({ status: 'cancelled' })),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    },
    scope: { requireStation: jest.fn(), deviceWhere: jest.fn() },
    permissions: { hasPermission: jest.fn().mockResolvedValue(true) },
    audit: { record: jest.fn() },
    validators: { validate: jest.fn() },
    queries: {
      where: jest.fn().mockResolvedValue({}),
      orderBy: jest.fn().mockReturnValue([{ requested_at: 'desc' }]),
    },
  };
}

function dtoMock() {
  return {
    commandType: 'device.status_request',
    payload: {},
    idempotencyKey: 'idem-1',
  };
}

function actor() {
  return { id: 'user-1' } as never;
}

function deviceMock() {
  return {
    id: 'device-1',
    station_id: 'station-1',
    lifecycle_status: 'active',
  };
}

function commandMock(extra: Record<string, unknown> = {}) {
  const requested = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'command-1',
    station_id: 'station-1',
    device_id: 'device-1',
    command_type: 'device.status_request',
    payload: {},
    status: 'queued',
    idempotency_key: 'idem-1',
    requested_by_user_id: 'user-1',
    requested_at: requested,
    available_at: requested,
    sent_at: null,
    acknowledged_at: null,
    completed_at: null,
    expires_at: null,
    failure_code: null,
    failure_reason: null,
    device_response: null,
    acknowledgement_event_id: null,
    ...extra,
  };
}

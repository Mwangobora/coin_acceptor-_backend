import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { CommandAcknowledgementService } from './command-acknowledgement.service';
import { CommandPayloadSanitizerService } from './command-payload-sanitizer.service';
import { CommandTransitionPolicy } from './command-transition.policy';

describe('CommandAcknowledgementService', () => {
  it('links acknowledgement events to sent commands', async () => {
    const tx = txMock({ status: 'sent' });
    const service = serviceWith(tx);
    await service.acknowledge(event(), {
      commandId: 'command-1',
      result: 'completed',
      response: {},
    });
    const update = tx.device_commands.update as jest.MockedFunction<
      (args: UpdateArgs) => unknown
    >;
    const call = update.mock.calls[0]?.[0];
    expect(call?.data.device_events).toEqual({ connect: { id: 'event-1' } });
  });

  it('rejects impossible terminal transitions', async () => {
    const service = serviceWith(txMock({ status: 'completed' }));
    await expect(
      service.acknowledge(event(), {
        commandId: 'command-1',
        result: 'acknowledged',
        response: {},
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('ignores duplicate acknowledgements safely', async () => {
    const tx = txMock({
      status: 'completed',
      acknowledgement_event_id: 'event-1',
    });
    await serviceWith(tx).acknowledge(event(), {
      commandId: 'command-1',
      result: 'completed',
      response: {},
    });
    expect(tx.device_commands.update).not.toHaveBeenCalled();
  });

  it('validates payloads and command ownership', async () => {
    await expect(
      serviceWith(txMock(null)).acknowledge(event(), {}),
    ).rejects.toThrow(BadRequestException);
    await expect(
      serviceWith(txMock(null)).acknowledge(event(), {
        commandId: 'command-1',
        result: 'completed',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('stores safe failure details for failed acknowledgements', async () => {
    const tx = txMock({ status: 'sent' });
    await serviceWith(tx).acknowledge(event(), {
      commandId: 'command-1',
      result: 'failed',
      response: { failureCode: 'jammed' },
    });
    const update = tx.device_commands.update as jest.MockedFunction<
      (args: FailureArgs) => unknown
    >;
    const call = update.mock.calls[0]?.[0];
    expect(call?.data.failure_code).toBe('jammed');
  });
});

function serviceWith(tx: TransactionMock) {
  const transaction = jest.fn(
    (fn: (client: TransactionMock) => Promise<void>) => fn(tx),
  );
  return new CommandAcknowledgementService(
    { $transaction: transaction } as never,
    new CommandPayloadSanitizerService(),
    new CommandTransitionPolicy(),
  );
}

function txMock(command: CommandState | null) {
  return {
    device_commands: {
      findFirst: jest.fn().mockResolvedValue(
        command
          ? {
              id: 'command-1',
              status: command.status,
              acknowledged_at: null,
              acknowledgement_event_id: command.acknowledgement_event_id,
            }
          : null,
      ),
      update: jest.fn(),
    },
  };
}

type UpdateArgs = {
  data: { device_events?: { connect: { id: string } } };
};

type FailureArgs = { data: { failure_code?: string } };
type CommandState = { status: string; acknowledgement_event_id?: string };
type TransactionMock = ReturnType<typeof txMock>;

function event() {
  return {
    id: 'event-1',
    device_id: 'device-1',
    received_at: new Date(),
  } as never;
}

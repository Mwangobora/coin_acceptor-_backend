import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type device_commands,
  type device_events,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  COMMAND_ACK_RESULTS,
  type CommandAckResult,
} from '../constants/device-command.constants';
import { CommandPayloadSanitizerService } from './command-payload-sanitizer.service';
import { CommandTransitionPolicy } from './command-transition.policy';

@Injectable()
export class CommandAcknowledgementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sanitizer: CommandPayloadSanitizerService,
    private readonly transitions: CommandTransitionPolicy,
  ) {}

  async acknowledge(
    event: device_events,
    payload: Prisma.JsonObject,
  ): Promise<void> {
    const parsed = this.parse(payload);
    this.sanitizer.assertSafe(parsed.response);
    await this.prisma.$transaction(async (tx) => {
      const command = await tx.device_commands.findFirst({
        where: { id: parsed.commandId, device_id: event.device_id },
      });
      if (!command) throw new NotFoundException('Device command not found.');
      if (command.acknowledgement_event_id === event.id) return;
      if (this.transitions.isDuplicateAck(command.status, parsed.result))
        return;
      this.transitions.assertCanAcknowledge(command.status, parsed.result);
      await tx.device_commands.update({
        where: { id: command.id },
        data: ackData(command, parsed, event),
      });
    });
  }

  private parse(payload: Prisma.JsonObject) {
    const commandId = stringValue(payload.commandId);
    const result = stringValue(payload.result);
    if (
      !commandId ||
      !COMMAND_ACK_RESULTS.includes(result as CommandAckResult)
    ) {
      throw new BadRequestException('Invalid command acknowledgement payload.');
    }
    const response = objectValue(payload.response);
    return { commandId, result: result as CommandAckResult, response };
  }
}

function ackData(
  command: device_commands,
  parsed: {
    result: CommandAckResult;
    response: Prisma.InputJsonObject;
  },
  event: device_events,
): Prisma.device_commandsUpdateInput {
  const now = event.received_at;
  return {
    status: parsed.result,
    device_events: { connect: { id: event.id } },
    device_response: parsed.response,
    ...(parsed.result === 'acknowledged' && !command.acknowledged_at
      ? { acknowledged_at: now }
      : {}),
    ...(parsed.result === 'completed'
      ? { completed_at: now, acknowledged_at: command.acknowledged_at ?? now }
      : {}),
    ...(parsed.result === 'failed'
      ? {
          failure_code:
            stringValue(parsed.response.failureCode) ?? 'device_failed',
          failure_reason:
            stringValue(parsed.response.failureReason) ??
            'Device reported command failure.',
        }
      : {}),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function objectValue(value: unknown): Prisma.InputJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

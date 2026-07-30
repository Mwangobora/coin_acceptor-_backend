import { Injectable } from '@nestjs/common';

import { CommandAcknowledgementService } from '../../device-commands/services/command-acknowledgement.service';
import type {
  DeviceEventContext,
  DeviceEventHandler,
} from '../types/device-event-handler.type';

@Injectable()
export class CommandAckEventHandler implements DeviceEventHandler {
  constructor(private readonly commands: CommandAcknowledgementService) {}

  canHandle(category: string, eventType: string): boolean {
    return (
      (category === 'command_ack' && eventType === 'device.command_ack') ||
      (category === 'command' && eventType === 'command.acknowledged')
    );
  }

  async handle(context: DeviceEventContext): Promise<void> {
    await this.commands.acknowledge(context.event, context.payload);
  }
}

import { Injectable } from '@nestjs/common';
import type { device_commands } from '@prisma/client';

import type { CreateDeviceCommandDto } from '../dto/create-device-command.dto';

@Injectable()
export class CommandIdempotencyService {
  matches(command: device_commands, dto: CreateDeviceCommandDto): boolean {
    const expectedAvailableAt = dto.availableAt
      ? new Date(dto.availableAt)
      : command.requested_at;
    return (
      command.command_type === dto.commandType &&
      JSON.stringify(command.payload) === JSON.stringify(dto.payload) &&
      command.available_at.getTime() === expectedAvailableAt.getTime() &&
      (command.expires_at?.getTime() ?? null) ===
        (dto.expiresAt ? new Date(dto.expiresAt).getTime() : null)
    );
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';

import type { CreateDeviceCommandDto } from '../dto/create-device-command.dto';

@Injectable()
export class CommandRequirementsPolicy {
  extraPermission(type: string): string | undefined {
    if (type === 'locker.emergency_open') return 'lockers.emergency_open';
    if (type === 'device.restart') return 'devices.restart';
    if (type === 'device.sync_configuration') return 'devices.configure';
    return undefined;
  }

  assertReason(type: string, reason?: string): void {
    if (type === 'locker.emergency_open' && !reason?.trim()) {
      throw new BadRequestException('Emergency open requires a reason.');
    }
  }

  assertTimes(dto: CreateDeviceCommandDto, requestedAt: Date): void {
    const availableAt = dto.availableAt
      ? new Date(dto.availableAt)
      : requestedAt;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    if (availableAt.getTime() < requestedAt.getTime()) {
      throw new BadRequestException(
        'availableAt cannot be before requestedAt.',
      );
    }
    if (expiresAt && expiresAt.getTime() <= requestedAt.getTime()) {
      throw new BadRequestException(
        'expiresAt must be later than requestedAt.',
      );
    }
  }
}

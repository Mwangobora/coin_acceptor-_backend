import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class StationStatusPolicy {
  validate(input: {
    currentStatus: string;
    nextStatus: string;
    reason?: string;
    activeDeviceCount: number;
  }): void {
    if (
      ['maintenance', 'inactive', 'decommissioned'].includes(
        input.nextStatus,
      ) &&
      !input.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required.');
    }
    if (
      input.currentStatus === 'decommissioned' &&
      input.nextStatus !== 'decommissioned'
    ) {
      throw new ConflictException(
        'Decommissioned stations cannot be reactivated.',
      );
    }
    if (input.nextStatus === 'decommissioned' && input.activeDeviceCount > 0) {
      throw new ConflictException(
        'Station has devices that are not decommissioned.',
      );
    }
  }
}

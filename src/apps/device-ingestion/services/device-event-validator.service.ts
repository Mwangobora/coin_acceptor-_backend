import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { CreateDeviceEventDto } from '../dto/create-device-event.dto';
import { HardwareEventContractValidator } from './hardware-event-contract.validator';
import { SensitivePayloadService } from './sensitive-payload.service';

@Injectable()
export class DeviceEventValidatorService {
  private readonly maxFutureSeconds: number;

  constructor(
    private readonly sensitive: SensitivePayloadService,
    private readonly hardware: HardwareEventContractValidator,
    config: ConfigService,
  ) {
    this.maxFutureSeconds = config.getOrThrow<number>(
      'security.deviceEventMaxFutureSeconds',
    );
  }

  validate(dto: CreateDeviceEventDto): Date {
    const occurredAt = new Date(dto.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid timestamp.');
    }
    if (occurredAt.getTime() > Date.now() + this.maxFutureSeconds * 1000) {
      throw new BadRequestException('occurredAt is too far in the future.');
    }
    if (!isPlainObject(dto.payload)) {
      throw new BadRequestException('payload must be an object.');
    }
    this.sensitive.assertSafe(dto.payload);
    this.hardware.validate(dto);
    return occurredAt;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

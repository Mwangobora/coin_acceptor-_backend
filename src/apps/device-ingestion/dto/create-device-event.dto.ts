import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  DEVICE_EVENT_CATEGORIES,
  DEVICE_EVENT_TYPE_PATTERN,
} from '../constants/device-event.constants';

export class CreateDeviceEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  externalEventId!: string;

  @IsIn(DEVICE_EVENT_CATEGORIES)
  eventCategory!: string;

  @IsString()
  @MaxLength(80)
  @Matches(DEVICE_EVENT_TYPE_PATTERN)
  eventType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  sequenceNumber?: number;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firmwareVersion?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

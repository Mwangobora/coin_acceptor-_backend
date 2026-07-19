import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { DEVICE_COMMAND_TYPES } from '../constants/device-command.constants';

export class CreateDeviceCommandDto {
  @IsIn(DEVICE_COMMAND_TYPES)
  commandType!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @IsOptional()
  @IsISO8601()
  availableAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

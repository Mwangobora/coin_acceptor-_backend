import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateDeviceDto {
  @IsUUID()
  stationId!: string;

  @IsString()
  deviceCode!: string;

  @IsString()
  serialNumber!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  hardwareVersion?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(86400)
  expectedHeartbeatIntervalSeconds?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

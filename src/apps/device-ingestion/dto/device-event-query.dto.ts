import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DeviceEventQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  eventCategory?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  processingStatus?: string;

  @IsOptional()
  @IsISO8601()
  occurredFrom?: string;

  @IsOptional()
  @IsISO8601()
  occurredTo?: string;

  @IsOptional()
  @IsISO8601()
  receivedFrom?: string;

  @IsOptional()
  @IsISO8601()
  receivedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalEventId?: string;
}

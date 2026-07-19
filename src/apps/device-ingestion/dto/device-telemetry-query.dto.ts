import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DeviceTelemetryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  powerSource?: string;

  @IsOptional()
  @IsString()
  faultCode?: string;

  @IsOptional()
  @IsISO8601()
  observedFrom?: string;

  @IsOptional()
  @IsISO8601()
  observedTo?: string;
}

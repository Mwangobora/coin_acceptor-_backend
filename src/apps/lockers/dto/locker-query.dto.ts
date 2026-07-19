import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class LockerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsIn(['available', 'reserved', 'in_use', 'maintenance', 'disabled', 'fault'])
  availabilityStatus?: string;

  @IsOptional()
  @IsIn(['open', 'closed', 'unknown'])
  doorStatus?: string;

  @IsOptional()
  @IsIn(['locked', 'unlocked', 'unknown', 'fault'])
  lockStatus?: string;

  @IsOptional()
  @IsIn(['normal', 'fault', 'unknown'])
  sensorStatus?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

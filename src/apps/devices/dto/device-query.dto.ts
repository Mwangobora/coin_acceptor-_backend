import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DeviceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsIn(['pending', 'active', 'maintenance', 'disabled', 'decommissioned'])
  lifecycleStatus?: string;

  @IsOptional()
  @IsIn(['online', 'offline', 'unknown'])
  connectivityStatus?: string;

  @IsOptional()
  @IsString()
  operationalStatus?: string;

  @IsOptional()
  @IsIn(['grid', 'backup_battery', 'none', 'unknown'])
  currentPowerSource?: string;

  @IsOptional()
  @IsDateString()
  lastSeenFrom?: string;

  @IsOptional()
  @IsDateString()
  lastSeenTo?: string;
}

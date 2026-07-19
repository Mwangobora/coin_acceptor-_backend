import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  DEVICE_COMMAND_STATUSES,
  DEVICE_COMMAND_TYPES,
} from '../constants/device-command.constants';

export class DeviceCommandQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsIn(DEVICE_COMMAND_TYPES)
  commandType?: string;

  @IsOptional()
  @IsIn(DEVICE_COMMAND_STATUSES)
  status?: string;

  @IsOptional()
  @IsUUID()
  requestedByUserId?: string;

  @IsOptional()
  @IsISO8601()
  requestedFrom?: string;

  @IsOptional()
  @IsISO8601()
  requestedTo?: string;
}

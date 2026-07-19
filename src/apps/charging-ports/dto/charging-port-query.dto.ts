import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ChargingPortQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  lockerId?: string;

  @IsOptional()
  @IsIn(['usb_a', 'usb_c', 'wireless', 'other'])
  portType?: string;

  @IsOptional()
  @IsIn(['available', 'in_use', 'maintenance', 'disabled', 'fault'])
  status?: string;

  @IsOptional()
  @IsIn(['on', 'off', 'fault', 'unknown'])
  powerState?: string;
}

import { IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PermissionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsISO8601()
  occurredFrom?: string;

  @IsOptional()
  @IsISO8601()
  occurredTo?: string;
}

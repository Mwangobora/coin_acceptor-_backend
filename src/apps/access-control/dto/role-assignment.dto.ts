import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class RoleAssignmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;
}

export class CreateRoleAssignmentDto {
  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class RevokeRoleAssignmentDto {
  @IsString()
  reason!: string;
}

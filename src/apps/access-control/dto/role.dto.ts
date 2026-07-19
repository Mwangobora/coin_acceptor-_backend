import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class RoleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class CreateRoleDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  @MaxLength(60)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleStatusDto {
  @IsIn(['active', 'inactive'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SyncRolePermissionsDto {
  @IsString({ each: true })
  permissionIds!: string[];
}

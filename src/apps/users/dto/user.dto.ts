import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class UserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'locked'])
  status?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsString()
  @MinLength(12)
  temporaryPassword!: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;
}

export class UpdateUserStatusDto {
  @IsIn(['active', 'inactive', 'suspended', 'locked'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetTemporaryPasswordDto {
  @IsString()
  @MinLength(12)
  temporaryPassword!: string;
}

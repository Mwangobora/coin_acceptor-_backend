import {
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStationDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  stationType!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(100)
  region!: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn(['planned', 'active', 'maintenance', 'inactive', 'decommissioned'])
  status?: string;

  @IsOptional()
  @IsDateString()
  installedAt?: string;
}

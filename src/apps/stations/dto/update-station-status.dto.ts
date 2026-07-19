import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStationStatusDto {
  @IsIn(['planned', 'active', 'maintenance', 'inactive', 'decommissioned'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

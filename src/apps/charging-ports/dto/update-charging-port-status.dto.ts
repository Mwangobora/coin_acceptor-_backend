import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateChargingPortStatusDto {
  @IsIn(['available', 'maintenance', 'disabled'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

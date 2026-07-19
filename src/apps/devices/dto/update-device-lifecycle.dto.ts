import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDeviceLifecycleDto {
  @IsIn(['pending', 'active', 'maintenance', 'disabled', 'decommissioned'])
  lifecycleStatus!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

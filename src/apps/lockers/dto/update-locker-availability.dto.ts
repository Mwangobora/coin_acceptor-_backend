import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateLockerAvailabilityDto {
  @IsIn(['available', 'maintenance', 'disabled'])
  availabilityStatus!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

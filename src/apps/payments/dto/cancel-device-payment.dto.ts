import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelDevicePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

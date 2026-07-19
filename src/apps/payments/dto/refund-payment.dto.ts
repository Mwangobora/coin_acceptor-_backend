import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

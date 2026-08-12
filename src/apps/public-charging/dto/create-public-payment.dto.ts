import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';

export const PUBLIC_PAYMENT_METHODS = [
  'mpesa',
  'mixx_by_yas',
  'airtel_money',
  'halopesa',
] as const;

export type PublicPaymentMethod = (typeof PUBLIC_PAYMENT_METHODS)[number];

export class CreatePublicPaymentDto {
  @ApiProperty({ example: 'public-package-id' })
  @IsString()
  @MaxLength(80)
  packageId!: string;

  @ApiProperty({ example: '4a95b078-0538-44df-b6da-9162515691f8' })
  @IsUUID()
  idempotencyKey!: string;

  @ApiProperty({ example: 'mpesa', enum: PUBLIC_PAYMENT_METHODS })
  @IsString()
  @IsIn(PUBLIC_PAYMENT_METHODS)
  paymentMethod!: PublicPaymentMethod;
}

import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PAYMENT_METHODS } from '../constants/payment.constants';

export class CreateDevicePaymentDto {
  @IsUUID()
  chargingPackageId!: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckoutTokenHeadersDto {
  @ApiProperty({ name: 'x-checkout-token' })
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  'x-checkout-token'!: string;
}

export class CustomerFlowHeadersDto {
  @ApiProperty({ name: 'x-customer-flow-token' })
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  'x-customer-flow-token'!: string;
}

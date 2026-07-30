import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePublicPaymentDto {
  @ApiProperty({ example: 'public-package-id' })
  @IsString()
  @MaxLength(80)
  packageId!: string;

  @ApiProperty({ example: '4a95b078-0538-44df-b6da-9162515691f8' })
  @IsUUID()
  idempotencyKey!: string;
}

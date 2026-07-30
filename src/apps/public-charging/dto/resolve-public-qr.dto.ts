import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResolvePublicQrDto {
  @ApiProperty({ example: 'opaque-token-from-url' })
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  qrToken!: string;
}

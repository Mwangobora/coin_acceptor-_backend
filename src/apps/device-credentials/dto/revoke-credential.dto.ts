import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RevokeCredentialDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

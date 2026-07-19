import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RotateCredentialDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  publicKeyPem?: string;

  @IsOptional()
  @IsString()
  certificateFingerprint?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCredentialDto {
  @IsIn(['api_key', 'hmac', 'certificate'])
  credentialType!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  publicKeyPem?: string;

  @IsOptional()
  @IsString()
  certificateFingerprint?: string;
}

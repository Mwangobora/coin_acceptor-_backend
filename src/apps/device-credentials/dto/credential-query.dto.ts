import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CredentialQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsIn(['api_key', 'hmac', 'certificate'])
  credentialType?: string;

  @IsOptional()
  @IsIn(['active', 'expired', 'revoked'])
  status?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  expiresBefore?: string;
}

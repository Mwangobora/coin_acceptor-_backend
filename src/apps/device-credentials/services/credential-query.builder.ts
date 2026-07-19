import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { CredentialQueryDto } from '../dto/credential-query.dto';

@Injectable()
export class CredentialQueryBuilder {
  filterWhere(query: CredentialQueryDto): Prisma.device_credentialsWhereInput {
    return {
      ...(query.deviceId ? { device_id: query.deviceId } : {}),
      ...(query.credentialType
        ? { credential_type: query.credentialType }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.validFrom
        ? { valid_from: { gte: new Date(query.validFrom) } }
        : {}),
      ...(query.expiresBefore
        ? { expires_at: { lte: new Date(query.expiresBefore) } }
        : {}),
    };
  }

  orderBy(sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'asc') {
    const fields = {
      keyId: 'key_id',
      credentialType: 'credential_type',
      status: 'status',
      validFrom: 'valid_from',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
    } as const;
    const field = fields[sortBy as keyof typeof fields] ?? 'created_at';
    return [
      { [field]: sortOrder },
      { id: 'asc' },
    ] as Prisma.device_credentialsOrderByWithRelationInput[];
  }
}

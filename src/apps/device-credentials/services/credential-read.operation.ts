import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  buildPaginatedResult,
  pageToSkip,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CredentialQueryDto } from '../dto/credential-query.dto';
import { mapCredential } from '../mappers/credential.mapper';
import { CredentialQueryBuilder } from './credential-query.builder';
import { CredentialRecordService } from './credential-record.service';

@Injectable()
export class CredentialReadOperation {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: StationScopeService,
    private readonly queryBuilder: CredentialQueryBuilder,
    private readonly records: CredentialRecordService,
  ) {}

  async list(query: CredentialQueryDto, actor: AuthenticatedUser) {
    const deviceScope = await this.scope.deviceWhere(
      actor.id,
      'device_credentials.read',
    );
    const where: Prisma.device_credentialsWhereInput = {
      ...this.queryBuilder.filterWhere(query),
      devices: {
        ...deviceScope,
        ...(query.stationId ? { station_id: query.stationId } : {}),
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.device_credentials.findMany({
        where,
        orderBy: this.queryBuilder.orderBy(query.sortBy, query.sortOrder),
        skip: pageToSkip(query.page, query.pageSize),
        take: query.pageSize,
      }),
      this.prisma.device_credentials.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => mapCredential(item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  listForDevice(
    deviceId: string,
    query: CredentialQueryDto,
    actor: AuthenticatedUser,
  ) {
    return this.list({ ...query, deviceId }, actor);
  }

  async get(deviceId: string, credentialId: string, actor: AuthenticatedUser) {
    const credential = await this.records.requireCredential(
      deviceId,
      credentialId,
    );
    await this.scope.requireStation(
      actor.id,
      'device_credentials.read',
      credential.devices.station_id,
    );
    return mapCredential(credential, { includePublicKey: true });
  }
}

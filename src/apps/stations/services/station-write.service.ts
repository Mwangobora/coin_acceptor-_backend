import { Injectable } from '@nestjs/common';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { mapPrismaError } from '../../../common/utils/prisma-error.util';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateStationDto } from '../dto/create-station.dto';
import type { UpdateStationDto } from '../dto/update-station.dto';
import { mapStation } from '../mappers/station.mapper';
import { StationAuditBuilder } from './station-audit.builder';
import { StationDataFactory } from './station-data.factory';
import { StationInputValidator } from './station-input.validator';
import { StationRecordService } from './station-record.service';

@Injectable()
export class StationWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly scope: StationScopeService,
    private readonly validator: StationInputValidator,
    private readonly dataFactory: StationDataFactory,
    private readonly auditBuilder: StationAuditBuilder,
    private readonly records: StationRecordService,
  ) {}

  async create(
    dto: CreateStationDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    await this.scope.requireGlobal(actor.id, 'stations.create');
    this.validator.validate(dto);
    try {
      const station = await this.prisma.$transaction(async (tx) => {
        const created = await tx.stations.create({
          data: this.dataFactory.create(dto, actor.id),
        });
        await this.audit.record(
          this.auditBuilder.build({
            action: 'stations.created',
            actorUserId: actor.id,
            after: created,
            meta,
          }),
          tx,
        );
        return created;
      });
      return mapStation(station);
    } catch (error) {
      mapPrismaError(error, { P2002: 'Station code already exists.' });
    }
  }

  async update(
    id: string,
    dto: UpdateStationDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    await this.scope.requireStation(actor.id, 'stations.update', id);
    this.validator.validate(dto);
    const station = await this.prisma.$transaction(async (tx) => {
      const before = await this.records.require(id, tx);
      const updated = await tx.stations.update({
        where: { id },
        data: this.dataFactory.update(dto),
      });
      await this.audit.record(
        this.auditBuilder.build({
          action: 'stations.updated',
          actorUserId: actor.id,
          after: updated,
          before,
          meta,
        }),
        tx,
      );
      return updated;
    });
    return mapStation(station);
  }
}

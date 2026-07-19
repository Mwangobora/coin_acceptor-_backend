import { Injectable } from '@nestjs/common';

import type { RequestMetadata } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CreateStationDto } from '../dto/create-station.dto';
import type { StationQueryDto } from '../dto/station-query.dto';
import type { UpdateStationStatusDto } from '../dto/update-station-status.dto';
import type { UpdateStationDto } from '../dto/update-station.dto';
import { StationReadService } from './station-read.service';
import { StationStatusService } from './station-status.service';
import { StationWriteService } from './station-write.service';

@Injectable()
export class StationsService {
  constructor(
    private readonly reads: StationReadService,
    private readonly writes: StationWriteService,
    private readonly statuses: StationStatusService,
  ) {}

  list(query: StationQueryDto, actor: AuthenticatedUser) {
    return this.reads.list(query, actor);
  }

  create(
    dto: CreateStationDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.writes.create(dto, actor, meta);
  }

  get(id: string, actor: AuthenticatedUser) {
    return this.reads.get(id, actor);
  }

  update(
    id: string,
    dto: UpdateStationDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.writes.update(id, dto, actor, meta);
  }

  updateStatus(
    id: string,
    dto: UpdateStationStatusDto,
    actor: AuthenticatedUser,
    meta: RequestMetadata,
  ) {
    return this.statuses.updateStatus(id, dto, actor, meta);
  }
}

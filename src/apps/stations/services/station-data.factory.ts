import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { CreateStationDto } from '../dto/create-station.dto';
import type { UpdateStationDto } from '../dto/update-station.dto';
import { StationInputValidator } from './station-input.validator';

@Injectable()
export class StationDataFactory {
  constructor(private readonly validator: StationInputValidator) {}

  create(dto: CreateStationDto, actorId: string): Prisma.stationsCreateInput {
    return {
      code: this.validator.normalizeCode(dto.code),
      name: dto.name.trim(),
      station_type: dto.stationType,
      description: dto.description,
      region: dto.region.trim(),
      district: dto.district,
      ward: dto.ward,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timezone: dto.timezone ?? 'Africa/Dar_es_Salaam',
      status: dto.status ?? 'active',
      installed_at: dto.installedAt ? new Date(dto.installedAt) : undefined,
      users: { connect: { id: actorId } },
    };
  }

  update(dto: UpdateStationDto): Prisma.stationsUpdateInput {
    return {
      name: dto.name?.trim(),
      description: dto.description,
      region: dto.region?.trim(),
      district: dto.district,
      ward: dto.ward,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timezone: dto.timezone,
      installed_at: dto.installedAt ? new Date(dto.installedAt) : undefined,
    };
  }
}

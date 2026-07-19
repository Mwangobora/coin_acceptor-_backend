import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { CreateDeviceDto } from '../dto/create-device.dto';
import type { UpdateDeviceDto } from '../dto/update-device.dto';
import { DeviceAdminPolicyService } from './device-admin-policy.service';

@Injectable()
export class DeviceDataFactory {
  constructor(private readonly adminPolicy: DeviceAdminPolicyService) {}

  create(dto: CreateDeviceDto, actorId: string): Prisma.devicesCreateInput {
    return {
      stations: { connect: { id: dto.stationId } },
      device_code: this.adminPolicy.normalizeCode(dto.deviceCode),
      serial_number: dto.serialNumber.trim(),
      name: dto.name.trim(),
      manufacturer: dto.manufacturer,
      model: dto.model,
      hardware_version: dto.hardwareVersion,
      expected_heartbeat_interval_seconds:
        dto.expectedHeartbeatIntervalSeconds ?? 60,
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      users: { connect: { id: actorId } },
    };
  }

  update(dto: UpdateDeviceDto): Prisma.devicesUncheckedUpdateInput {
    return {
      station_id: dto.stationId,
      name: dto.name?.trim(),
      manufacturer: dto.manufacturer,
      model: dto.model,
      hardware_version: dto.hardwareVersion,
      expected_heartbeat_interval_seconds: dto.expectedHeartbeatIntervalSeconds,
      metadata: dto.metadata as Prisma.InputJsonObject | undefined,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StationScopeService } from '../../access-control/services/station-scope.service';
import { PrismaService } from '../../../database/prisma.service';

type DevicePolicyClient = Pick<
  Prisma.TransactionClient,
  'stations' | 'charging_sessions' | 'payments' | 'device_events'
>;

@Injectable()
export class DeviceAdminPolicyService {
  constructor(private readonly scope: StationScopeService) {}

  normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }

  validateText(value: string, label: string): void {
    if (!value.trim()) {
      throw new BadRequestException(`${label} cannot be blank.`);
    }
  }

  async validateStationAssignable(
    stationId: string,
    client: DevicePolicyClient | PrismaService,
  ): Promise<void> {
    const station = await client.stations.findUnique({
      where: { id: stationId },
    });
    if (!station) throw new BadRequestException('Station not found.');
    if (['inactive', 'decommissioned'].includes(station.status)) {
      throw new BadRequestException('Station is not assignable.');
    }
  }

  async validateStationChange(input: {
    device: { id: string; lifecycle_status: string };
    stationId: string;
    actorId: string;
    client: DevicePolicyClient | PrismaService;
  }): Promise<void> {
    if (input.device.lifecycle_status !== 'pending') {
      throw new ConflictException('Station can change only while pending.');
    }
    await this.scope.requireStation(
      input.actorId,
      'devices.update',
      input.stationId,
    );
    await this.validateStationAssignable(input.stationId, input.client);
    const [sessions, payments, events] = await Promise.all([
      input.client.charging_sessions.count({
        where: { device_id: input.device.id },
      }),
      input.client.payments.count({ where: { device_id: input.device.id } }),
      input.client.device_events.count({
        where: { device_id: input.device.id },
      }),
    ]);
    if (sessions + payments + events > 0) {
      throw new ConflictException('Device has historical activity.');
    }
  }
}

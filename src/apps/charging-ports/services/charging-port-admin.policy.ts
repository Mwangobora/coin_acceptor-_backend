import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { charging_ports, devices, lockers } from '@prisma/client';

import type { CreateChargingPortDto } from '../dto/create-charging-port.dto';
import type { UpdateChargingPortDto } from '../dto/update-charging-port.dto';
import { ChargingPortRecordService } from './charging-port-record.service';

type LockerWithDevice = lockers & { devices: devices };
type PortWithDevice = charging_ports & { devices: devices };

@Injectable()
export class ChargingPortAdminPolicy {
  constructor(private readonly records: ChargingPortRecordService) {}

  async validateCreate(locker: LockerWithDevice, dto: CreateChargingPortDto) {
    if (
      ['disabled', 'decommissioned'].includes(locker.devices.lifecycle_status)
    ) {
      throw new BadRequestException('Device cannot receive charging ports.');
    }
    if (locker.availability_status === 'disabled') {
      throw new BadRequestException('Locker is disabled.');
    }
    await this.ensureUnique(locker.device_id, dto.hardwareChannel);
  }

  async validateUpdate(port: PortWithDevice, dto: UpdateChargingPortDto) {
    if ((await this.records.activeSessionCount(port.id)) > 0) {
      throw new ConflictException('Port has an active charging session.');
    }
    if (port.power_state === 'on') {
      throw new ConflictException('Powered ports cannot be reconfigured.');
    }
    if (dto.hardwareChannel && dto.hardwareChannel !== port.hardware_channel) {
      if (
        !['pending', 'maintenance', 'disabled'].includes(
          port.devices.lifecycle_status,
        )
      ) {
        throw new ConflictException(
          'Device lifecycle prevents hardware-channel changes.',
        );
      }
      await this.ensureUnique(port.device_id, dto.hardwareChannel, port.id);
    }
  }

  private async ensureUnique(deviceId: string, channel?: string, id?: string) {
    try {
      await this.records.ensureHardwareChannelUnique(deviceId, channel, id);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'duplicate_hardware_channel'
      ) {
        throw new ConflictException('Hardware channel already exists.');
      }
      throw error;
    }
  }
}

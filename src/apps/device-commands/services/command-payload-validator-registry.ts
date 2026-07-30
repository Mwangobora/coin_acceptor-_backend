import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { CommandPayloadSanitizerService } from './command-payload-sanitizer.service';
import { HardwareCommandContractValidator } from './hardware-command-contract.validator';

@Injectable()
export class CommandPayloadValidatorRegistry {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sanitizer: CommandPayloadSanitizerService,
    private readonly hardware: HardwareCommandContractValidator,
  ) {}

  async validate(input: {
    commandType: string;
    deviceId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    this.sanitizer.assertSafe(input.payload);
    this.hardware.validate(input.commandType, input.payload);
    if (input.commandType.startsWith('locker.')) {
      await this.requireLocker(input.deviceId, input.payload);
    }
    if (input.commandType.startsWith('charging.')) {
      await this.requireChargingPort(input.deviceId, input.payload);
    }
    if (input.commandType.startsWith('port.')) {
      await this.requirePort(input.deviceId, input.payload);
    }
  }

  private async requireLocker(
    deviceId: string,
    payload: Record<string, unknown>,
  ) {
    const where = lockerWhere(deviceId, payload);
    if (!where) throw new BadRequestException('Locker identity is required.');
    const locker = await this.prisma.lockers.findFirst({ where });
    if (!locker)
      throw new BadRequestException('Locker does not belong to device.');
  }

  private async requirePort(
    deviceId: string,
    payload: Record<string, unknown>,
  ) {
    const portId = stringValue(payload.portId);
    if (!portId) throw new BadRequestException('Port identity is required.');
    const port = await this.prisma.charging_ports.findFirst({
      where: { id: portId, device_id: deviceId },
    });
    if (!port) throw new BadRequestException('Port does not belong to device.');
  }

  private async requireChargingPort(
    deviceId: string,
    payload: Record<string, unknown>,
  ) {
    const portId = stringValue(payload.portId);
    if (portId) {
      await this.requirePort(deviceId, payload);
      return;
    }
    const lockerNumber = numberValue(payload.lockerNumber);
    const portNumber = numberValue(payload.portNumber);
    if (lockerNumber === undefined || portNumber === undefined) {
      throw new BadRequestException('Locker and port identity are required.');
    }
    const port = await this.prisma.charging_ports.findFirst({
      where: {
        device_id: deviceId,
        port_number: portNumber,
        lockers: { locker_number: lockerNumber },
      },
    });
    if (!port) throw new BadRequestException('Port does not belong to device.');
  }
}

function lockerWhere(deviceId: string, payload: Record<string, unknown>) {
  const lockerId = stringValue(payload.lockerId);
  if (lockerId) return { id: lockerId, device_id: deviceId };
  const lockerNumber = numberValue(payload.lockerNumber);
  if (lockerNumber === undefined) return null;
  return { device_id: deviceId, locker_number: lockerNumber };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return Number.isInteger(value) ? Number(value) : undefined;
}

import { Injectable } from '@nestjs/common';
import type { lockers } from '@prisma/client';

import type { CreateChargingPortDto } from '../dto/create-charging-port.dto';
import type { UpdateChargingPortDto } from '../dto/update-charging-port.dto';

@Injectable()
export class ChargingPortDataFactory {
  create(locker: lockers, dto: CreateChargingPortDto) {
    return {
      device_id: locker.device_id,
      locker_id: locker.id,
      port_number: dto.portNumber,
      port_type: dto.portType,
      hardware_channel: dto.hardwareChannel,
      maximum_voltage: dto.maximumVoltage,
      maximum_current_ma: dto.maximumCurrentMa,
      maximum_power_watts: dto.maximumPowerWatts,
    };
  }

  update(dto: UpdateChargingPortDto) {
    return {
      port_type: dto.portType,
      hardware_channel: dto.hardwareChannel,
      maximum_voltage: dto.maximumVoltage,
      maximum_current_ma: dto.maximumCurrentMa,
      maximum_power_watts: dto.maximumPowerWatts,
    };
  }
}

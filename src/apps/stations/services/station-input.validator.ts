import { BadRequestException, Injectable } from '@nestjs/common';

import type { CreateStationDto } from '../dto/create-station.dto';
import type { UpdateStationDto } from '../dto/update-station.dto';

@Injectable()
export class StationInputValidator {
  validate(dto: Partial<CreateStationDto & UpdateStationDto>): void {
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('Name is required.');
    }
    if (dto.region !== undefined && !dto.region.trim()) {
      throw new BadRequestException('Region is required.');
    }
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException(
        'Latitude and longitude must be supplied together.',
      );
    }
    if (dto.timezone) this.validateTimezone(dto.timezone);
  }

  normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private validateTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      throw new BadRequestException('Invalid timezone.');
    }
  }
}

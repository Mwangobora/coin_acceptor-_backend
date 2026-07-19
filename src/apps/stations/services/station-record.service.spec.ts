import { NotFoundException } from '@nestjs/common';

import { StationRecordService } from './station-record.service';

describe('StationRecordService', () => {
  it('throws when a station is missing', async () => {
    const service = new StationRecordService();
    await expect(
      service.require('station-1', {
        stations: { findUnique: jest.fn().mockResolvedValue(null) },
      } as never),
    ).rejects.toThrow(NotFoundException);
  });
});

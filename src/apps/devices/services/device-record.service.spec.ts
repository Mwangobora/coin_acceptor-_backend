import { NotFoundException } from '@nestjs/common';

import { DeviceRecordService } from './device-record.service';

describe('DeviceRecordService', () => {
  it('throws when a device is missing and counts active sessions', async () => {
    const service = new DeviceRecordService();
    const client = {
      devices: { findUnique: jest.fn().mockResolvedValue(null) },
      charging_sessions: { count: jest.fn().mockResolvedValue(2) },
    } as never;

    await expect(service.require('device-1', client)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.activeSessionCount('device-1', client)).resolves.toBe(
      2,
    );
  });
});

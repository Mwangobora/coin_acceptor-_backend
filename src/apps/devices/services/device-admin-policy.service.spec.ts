import { BadRequestException, ConflictException } from '@nestjs/common';

import { DeviceAdminPolicyService } from './device-admin-policy.service';

describe('DeviceAdminPolicyService', () => {
  const scope = { requireStation: jest.fn() };
  const service = new DeviceAdminPolicyService(scope as never);

  it('normalizes codes and rejects blank text', () => {
    expect(service.normalizeCode(' coin device ')).toBe('COIN_DEVICE');
    expect(() => service.validateText(' ', 'Name')).toThrow(
      BadRequestException,
    );
  });

  it('validates assignable stations', async () => {
    await expect(
      service.validateStationAssignable('station-1', {
        stations: { findUnique: jest.fn().mockResolvedValue(null) },
      } as never),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.validateStationAssignable('station-1', {
        stations: {
          findUnique: jest.fn().mockResolvedValue({ status: 'inactive' }),
        },
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks station changes after lifecycle or history locks', async () => {
    await expect(
      service.validateStationChange({
        device: { id: 'device-1', lifecycle_status: 'active' },
        stationId: 'station-2',
        actorId: 'user-1',
        client: {} as never,
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.validateStationChange({
        device: { id: 'device-1', lifecycle_status: 'pending' },
        stationId: 'station-2',
        actorId: 'user-1',
        client: historyClient(),
      }),
    ).rejects.toThrow(ConflictException);
  });
});

function historyClient() {
  return {
    stations: { findUnique: jest.fn().mockResolvedValue({ status: 'active' }) },
    charging_sessions: { count: jest.fn().mockResolvedValue(1) },
    payments: { count: jest.fn().mockResolvedValue(0) },
    device_events: { count: jest.fn().mockResolvedValue(0) },
  } as never;
}

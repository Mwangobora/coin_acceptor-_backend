import { ForbiddenException } from '@nestjs/common';

import { StationScopeService } from './station-scope.service';

describe('StationScopeService', () => {
  it('returns unrestricted scope for global assignments', async () => {
    const service = new StationScopeService({
      user_role_assignments: {
        findMany: jest.fn().mockResolvedValue([{ station_id: null }]),
      },
    } as never);

    await expect(
      service.stationWhere('user-1', 'stations.read'),
    ).resolves.toEqual({});
  });

  it('rejects stations outside scoped assignments', async () => {
    const service = new StationScopeService({
      user_role_assignments: {
        findMany: jest.fn().mockResolvedValue([{ station_id: 'station-1' }]),
      },
    } as never);

    await expect(
      service.requireStation('user-1', 'stations.read', 'station-2'),
    ).rejects.toThrow(ForbiddenException);
  });
});

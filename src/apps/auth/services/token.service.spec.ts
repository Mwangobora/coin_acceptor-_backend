import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { TokenService } from './token.service';

describe('TokenService', () => {
  const service = new TokenService(
    {
      getOrThrow: (key: string) =>
        ({
          'security.jwtAccessSecret': 'access-secret',
          'security.jwtRefreshSecret': 'refresh-secret',
          'security.jwtAccessTtl': '7d',
          'security.jwtRefreshTtl': '30d',
        })[key],
    } as unknown as ConfigService,
    new JwtService(),
  );

  it('signs and verifies access tokens only as access tokens', async () => {
    const token = await service.signAccess('user-1', 'session-1');
    const payload = await service.verifyAccess(token);

    expect(payload).toEqual(
      expect.objectContaining({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'access',
      }),
    );
    await expect(service.verifyRefresh(token)).rejects.toThrow();
  });

  it('signs and verifies refresh tokens', async () => {
    const token = await service.signRefresh({
      userId: 'user-1',
      sessionId: 'session-1',
      tokenFamilyId: 'family-1',
    });

    await expect(service.verifyRefresh(token)).resolves.toEqual(
      expect.objectContaining({ tokenFamilyId: 'family-1', type: 'refresh' }),
    );
  });

  it('rejects refresh tokens with the wrong token type', async () => {
    const token = await new JwtService().signAsync(
      { sub: 'user-1', sessionId: 'session-1', type: 'access' },
      { secret: 'refresh-secret', expiresIn: '30d' },
    );

    await expect(service.verifyRefresh(token)).rejects.toThrow();
  });

  it('rejects access tokens with the wrong token type', async () => {
    const token = await new JwtService().signAsync(
      {
        sub: 'user-1',
        sessionId: 'session-1',
        tokenFamilyId: 'family-1',
        type: 'refresh',
      },
      { secret: 'access-secret', expiresIn: '7d' },
    );

    await expect(service.verifyAccess(token)).rejects.toThrow();
  });
});

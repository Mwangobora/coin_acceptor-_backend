import { UnauthorizedException } from '@nestjs/common';

import { RefreshTokenReuseError } from '../types/auth-errors.type';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const payload = {
    sub: 'user-1',
    sessionId: 'session-1',
    tokenFamilyId: 'family-1',
    type: 'refresh' as const,
  };

  it('revokes a token family when rotated refresh token is reused', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new AuthSessionService(
      {
        auth_sessions: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'session-1',
            user_id: 'user-1',
            token_family_id: 'family-1',
            revoked_at: new Date(),
            revoke_reason: 'rotated',
            expires_at: new Date(Date.now() + 60_000),
            refresh_token_hash: 'hash',
            users: { status: 'active', locked_until: null },
          }),
          updateMany,
        },
      } as never,
      { verify: jest.fn() } as never,
    );

    await expect(
      service.rotateSession({
        payload,
        oldRefreshToken: 'old',
        newRefreshToken: 'new',
        newSessionId: 'session-2',
        expiresAt: new Date(),
        metadata: {},
      }),
    ).rejects.toThrow(RefreshTokenReuseError);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token_family_id: 'family-1', revoked_at: null },
      }),
    );
  });

  it('rejects a refresh token for inactive users', async () => {
    const service = new AuthSessionService(
      {
        auth_sessions: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'session-1',
            user_id: 'user-1',
            token_family_id: 'family-1',
            revoked_at: null,
            expires_at: new Date(Date.now() + 60_000),
            users: { status: 'inactive', locked_until: null },
          }),
        },
      } as never,
      { verify: jest.fn() } as never,
    );

    await expect(
      service.rotateSession({
        payload,
        oldRefreshToken: 'old',
        newRefreshToken: 'new',
        newSessionId: 'session-2',
        expiresAt: new Date(),
        metadata: {},
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects missing, mismatched, expired, and invalid refresh sessions', async () => {
    const cases = [
      undefined,
      { user_id: 'other-user', token_family_id: 'family-1' },
      { user_id: 'user-1', token_family_id: 'other-family' },
      {
        user_id: 'user-1',
        token_family_id: 'family-1',
        revoked_at: null,
        expires_at: new Date(Date.now() - 60_000),
        users: { status: 'active', locked_until: null },
      },
    ];

    for (const session of cases) {
      const service = new AuthSessionService(
        {
          auth_sessions: {
            findUnique: jest.fn().mockResolvedValue(session),
          },
        } as never,
        { verify: jest.fn().mockResolvedValue(false) } as never,
      );

      await expect(
        service.rotateSession({
          payload,
          oldRefreshToken: 'old',
          newRefreshToken: 'new',
          newSessionId: 'session-2',
          expiresAt: new Date(),
          metadata: {},
        }),
      ).rejects.toThrow(UnauthorizedException);
    }
  });

  it('rejects refresh when the stored hash does not match', async () => {
    const service = new AuthSessionService(
      {
        auth_sessions: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'session-1',
            user_id: 'user-1',
            token_family_id: 'family-1',
            revoked_at: null,
            expires_at: new Date(Date.now() + 60_000),
            refresh_token_hash: 'hash',
            users: { status: 'active', locked_until: null },
          }),
        },
      } as never,
      { verify: jest.fn().mockResolvedValue(false) } as never,
    );

    await expect(
      service.rotateSession({
        payload,
        oldRefreshToken: 'old',
        newRefreshToken: 'new',
        newSessionId: 'session-2',
        expiresAt: new Date(),
        metadata: {},
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

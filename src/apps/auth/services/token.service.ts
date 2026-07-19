import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
} from '../constants/auth.constants';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../types/jwt-payload.type';

@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async signAccess(userId: string, sessionId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, sessionId, type: ACCESS_TOKEN_TYPE },
      {
        secret: this.config.getOrThrow<string>('security.jwtAccessSecret'),
        expiresIn: this.config.getOrThrow<StringValue>('security.jwtAccessTtl'),
      },
    );
  }

  async signRefresh(input: {
    userId: string;
    sessionId: string;
    tokenFamilyId: string;
  }): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: input.userId,
        sessionId: input.sessionId,
        tokenFamilyId: input.tokenFamilyId,
        type: REFRESH_TOKEN_TYPE,
      },
      {
        secret: this.config.getOrThrow<string>('security.jwtRefreshSecret'),
        expiresIn: this.config.getOrThrow<StringValue>(
          'security.jwtRefreshTtl',
        ),
      },
    );
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('security.jwtRefreshSecret'),
    });
    if (payload.type !== REFRESH_TOKEN_TYPE) throw new UnauthorizedException();
    return payload;
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('security.jwtAccessSecret'),
    });
    if (payload.type !== ACCESS_TOKEN_TYPE) throw new UnauthorizedException();
    return payload;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  AUTH_COOKIE_PATH,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
} from '../constants/auth.constants';
import { AuthTtlService } from './auth-ttl.service';

@Injectable()
export class AuthCookieService {
  constructor(
    private readonly config: ConfigService,
    private readonly ttl: AuthTtlService,
  ) {}

  setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...this.baseOptions(AUTH_COOKIE_PATH),
      maxAge: this.ttl.toMilliseconds(
        this.config.getOrThrow<string>('security.jwtAccessTtl'),
      ),
    });
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.baseOptions(REFRESH_COOKIE_PATH),
      maxAge: this.ttl.toMilliseconds(
        this.config.getOrThrow<string>('security.jwtRefreshTtl'),
      ),
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(
      ACCESS_TOKEN_COOKIE,
      this.baseOptions(AUTH_COOKIE_PATH),
    );
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      this.baseOptions(REFRESH_COOKIE_PATH),
    );
  }

  private baseOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('security.cookieSecure'),
      sameSite: this.config.getOrThrow<'lax' | 'strict' | 'none'>(
        'security.cookieSameSite',
      ),
      path,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';

import { API_VERSION } from '../../common/constants/api.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthCookieService } from './services/auth-cookie.service';
import { AuthService } from './services/auth.service';
import { REFRESH_TOKEN_COOKIE } from './constants/auth.constants';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { AuthRequest, RequestMetadata } from './types/auth-request.type';

@ApiTags('auth')
@Controller({ path: 'auth', version: API_VERSION })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ description: 'Sets HttpOnly auth cookies.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      this.metadata(request),
    );
    this.cookies.setAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
    );
    return result.body;
  }

  @Post('refresh')
  @ApiOkResponse({ description: 'Rotates refresh session and resets cookies.' })
  async refresh(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.auth.refresh(
        this.refreshCookie(request),
        this.metadata(request),
      );
      this.cookies.setAuthCookies(
        response,
        result.accessToken,
        result.refreshToken,
      );
      return result.body;
    } catch (error) {
      this.cookies.clearAuthCookies(response);
      throw error;
    }
  }

  @Post('logout')
  @ApiOkResponse({ description: 'Clears cookies and revokes refresh session.' })
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const body = await this.auth.logout(
      this.cookieValue(request, REFRESH_TOKEN_COOKIE),
      this.metadata(request),
    );
    this.cookies.clearAuthCookies(response);
    return body;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const body = await this.auth.logoutAll(user, this.metadata(request));
    this.cookies.clearAuthCookies(response);
    return body;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const body = await this.auth.changePassword(
      user,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
      this.metadata(request),
    );
    this.cookies.clearAuthCookies(response);
    return body;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listSessions(user);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const body = await this.auth.revokeSession(
      user,
      sessionId,
      this.metadata(request),
    );
    if (sessionId === user.sessionId) this.cookies.clearAuthCookies(response);
    return body;
  }

  private refreshCookie(request: AuthRequest): string {
    const token = this.cookieValue(request, REFRESH_TOKEN_COOKIE);
    if (!token) throw new UnauthorizedException();
    return token;
  }

  private cookieValue(request: AuthRequest, name: string): string | undefined {
    const cookies: unknown = request.cookies;
    if (!cookies || typeof cookies !== 'object') return undefined;
    const value = (cookies as Record<string, unknown>)[name];
    return typeof value === 'string' ? value : undefined;
  }

  private metadata(request: AuthRequest): RequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      requestId: request.requestId,
    };
  }
}

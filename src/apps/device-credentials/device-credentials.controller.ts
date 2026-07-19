import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../common/constants/api.constants';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialQueryDto } from './dto/credential-query.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import { RotateCredentialDto } from './dto/rotate-credential.dto';
import { DeviceCredentialService } from './services/device-credential.service';

@ApiTags('device-credentials')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class DeviceCredentialsController {
  constructor(private readonly credentials: DeviceCredentialService) {}

  @Get('device-credentials')
  @RequirePermissions('device_credentials.read')
  list(
    @Query() query: CredentialQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.credentials.list(query, user);
  }

  @Get('devices/:deviceId/credentials')
  @RequirePermissions('device_credentials.read')
  listForDevice(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() query: CredentialQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.credentials.listForDevice(deviceId, query, user);
  }

  @Get('devices/:deviceId/credentials/:credentialId')
  @RequirePermissions('device_credentials.read')
  get(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Param('credentialId', ParseUUIDPipe) credentialId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.credentials.get(deviceId, credentialId, user);
  }

  @Post('devices/:deviceId/credentials')
  @RequirePermissions('device_credentials.create')
  create(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: CreateCredentialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.credentials.create(deviceId, dto, user, metadata(req));
  }

  @Post('devices/:deviceId/credentials/:credentialId/rotate')
  @RequirePermissions('device_credentials.rotate')
  rotate(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Param('credentialId', ParseUUIDPipe) credentialId: string,
    @Body() dto: RotateCredentialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.credentials.rotate(
      deviceId,
      credentialId,
      dto,
      user,
      metadata(req),
    );
  }

  @Post('devices/:deviceId/credentials/:credentialId/revoke')
  @RequirePermissions('device_credentials.revoke')
  revoke(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Param('credentialId', ParseUUIDPipe) credentialId: string,
    @Body() dto: RevokeCredentialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.credentials.revoke(
      deviceId,
      credentialId,
      dto,
      user,
      metadata(req),
    );
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateLockerDto } from './dto/create-locker.dto';
import { LockerQueryDto } from './dto/locker-query.dto';
import { UpdateLockerAvailabilityDto } from './dto/update-locker-availability.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { LockersService } from './services/lockers.service';

@ApiTags('lockers')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class LockersController {
  constructor(private readonly lockers: LockersService) {}

  @Get('lockers')
  @RequirePermissions('lockers.read')
  list(@Query() query: LockerQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lockers.list(query, user);
  }

  @Get('devices/:deviceId/lockers')
  @RequirePermissions('lockers.read')
  listForDevice(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() query: LockerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lockers.listForDevice(deviceId, query, user);
  }

  @Post('devices/:deviceId/lockers')
  @RequirePermissions('lockers.configure')
  create(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: CreateLockerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.lockers.create(deviceId, dto, user, metadata(req));
  }

  @Get('lockers/:id')
  @RequirePermissions('lockers.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lockers.get(id, user);
  }

  @Patch('lockers/:id')
  @RequirePermissions('lockers.configure')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLockerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.lockers.update(id, dto, user, metadata(req));
  }

  @Patch('lockers/:id/availability-status')
  @RequirePermissions('lockers.configure')
  updateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLockerAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.lockers.updateAvailability(id, dto, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

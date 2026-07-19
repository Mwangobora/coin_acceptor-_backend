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
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceQueryDto } from './dto/device-query.dto';
import { UpdateDeviceLifecycleDto } from './dto/update-device-lifecycle.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesService } from './services/devices.service';

@ApiTags('devices')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get('devices')
  @RequirePermissions('devices.read')
  list(@Query() query: DeviceQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devices.list(query, user);
  }

  @Post('devices')
  @RequirePermissions('devices.create')
  create(
    @Body() dto: CreateDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.devices.create(dto, user, metadata(req));
  }

  @Get('devices/:id')
  @RequirePermissions('devices.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.get(id, user);
  }

  @Patch('devices/:id')
  @RequirePermissions('devices.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.devices.update(id, dto, user, metadata(req));
  }

  @Patch('devices/:id/lifecycle-status')
  @RequirePermissions('devices.disable')
  updateLifecycle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceLifecycleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.devices.updateLifecycle(id, dto, user, metadata(req));
  }

  @Get('stations/:stationId/devices')
  @RequirePermissions('devices.read')
  listForStation(
    @Param('stationId', ParseUUIDPipe) stationId: string,
    @Query() query: DeviceQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.listForStation(stationId, query, user);
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

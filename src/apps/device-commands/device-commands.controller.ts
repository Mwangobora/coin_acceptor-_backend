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
import { CancelDeviceCommandDto } from './dto/cancel-device-command.dto';
import { CreateDeviceCommandDto } from './dto/create-device-command.dto';
import { DeviceCommandQueryDto } from './dto/device-command-query.dto';
import { DeviceCommandsService } from './services/device-commands.service';

@ApiTags('device-commands')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class DeviceCommandsController {
  constructor(private readonly commands: DeviceCommandsService) {}

  @Get('device-commands')
  @RequirePermissions('device_commands.read')
  list(
    @Query() query: DeviceCommandQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commands.list(query, user);
  }

  @Post('devices/:deviceId/commands')
  @RequirePermissions('device_commands.create')
  create(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: CreateDeviceCommandDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.commands.create(deviceId, dto, user, metadata(req));
  }

  @Get('device-commands/:id')
  @RequirePermissions('device_commands.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commands.get(id, user);
  }

  @Post('device-commands/:id/cancel')
  @RequirePermissions('device_commands.cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDeviceCommandDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.commands.cancel(id, dto.reason, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

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
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CommandPollingService } from '../device-commands/services/command-polling.service';
import { DeviceAuthGuard } from './auth/device-auth.guard';
import { CreateDeviceEventDto } from './dto/create-device-event.dto';
import { DeviceEventQueryDto } from './dto/device-event-query.dto';
import { DeviceTelemetryQueryDto } from './dto/device-telemetry-query.dto';
import { DeviceEventReadService } from './services/device-event-read.service';
import { DeviceEventService } from './services/device-event.service';
import { DeviceTelemetryReadService } from './services/device-telemetry-read.service';
import type { DeviceAuthRequest } from './types/authenticated-device.type';

@ApiTags('device-ingestion')
@Controller({ version: API_VERSION })
export class DeviceIngestionController {
  constructor(
    private readonly events: DeviceEventService,
    private readonly eventReads: DeviceEventReadService,
    private readonly telemetryReads: DeviceTelemetryReadService,
    private readonly commandPolling: CommandPollingService,
  ) {}

  @Post('device-ingestion/events')
  @UseGuards(DeviceAuthGuard)
  ingest(@Body() dto: CreateDeviceEventDto, @Req() req: DeviceAuthRequest) {
    return this.events.ingest({
      auth: req.deviceAuth!,
      dto,
      requestId: req.requestId,
      sourceIp: req.ip,
    });
  }

  @Get('device-ingestion/commands')
  @UseGuards(DeviceAuthGuard)
  pollCommands(@Req() req: DeviceAuthRequest) {
    return this.commandPolling.poll(req.deviceAuth!);
  }

  @Get('device-events')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device_events.read')
  listEvents(
    @Query() query: DeviceEventQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventReads.list(query, user);
  }

  @Get('device-events/:id')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device_events.read')
  getEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventReads.get(id, user);
  }

  @Get('device-telemetry')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device_telemetry.read')
  listTelemetry(
    @Query() query: DeviceTelemetryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telemetryReads.list(query, user);
  }

  @Get('device-telemetry/:id')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device_telemetry.read')
  getTelemetry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telemetryReads.get(id, user);
  }

  @Get('devices/:deviceId/telemetry/latest')
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('device_telemetry.read')
  latestTelemetry(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.telemetryReads.latestForDevice(deviceId, user);
  }
}

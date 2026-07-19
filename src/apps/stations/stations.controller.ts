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
import { CreateStationDto } from './dto/create-station.dto';
import { StationQueryDto } from './dto/station-query.dto';
import { UpdateStationStatusDto } from './dto/update-station-status.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { StationsService } from './services/stations.service';

@ApiTags('stations')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'stations', version: API_VERSION })
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Get()
  @RequirePermissions('stations.read')
  list(
    @Query() query: StationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stations.list(query, user);
  }

  @Post()
  @RequirePermissions('stations.create')
  create(
    @Body() dto: CreateStationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.stations.create(dto, user, metadata(req));
  }

  @Get(':id')
  @RequirePermissions('stations.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stations.get(id, user);
  }

  @Patch(':id')
  @RequirePermissions('stations.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.stations.update(id, dto, user, metadata(req));
  }

  @Patch(':id/status')
  @RequirePermissions('stations.deactivate')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.stations.updateStatus(id, dto, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

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
import { ChargingPortQueryDto } from './dto/charging-port-query.dto';
import { CreateChargingPortDto } from './dto/create-charging-port.dto';
import { UpdateChargingPortStatusDto } from './dto/update-charging-port-status.dto';
import { UpdateChargingPortDto } from './dto/update-charging-port.dto';
import { ChargingPortsService } from './services/charging-ports.service';

@ApiTags('charging-ports')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: API_VERSION })
export class ChargingPortsController {
  constructor(private readonly ports: ChargingPortsService) {}

  @Get('charging-ports')
  @RequirePermissions('charging_ports.read')
  list(
    @Query() query: ChargingPortQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ports.list(query, user);
  }

  @Get('lockers/:lockerId/charging-ports')
  @RequirePermissions('charging_ports.read')
  listForLocker(
    @Param('lockerId', ParseUUIDPipe) lockerId: string,
    @Query() query: ChargingPortQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ports.listForLocker(lockerId, query, user);
  }

  @Post('lockers/:lockerId/charging-ports')
  @RequirePermissions('charging_ports.configure')
  create(
    @Param('lockerId', ParseUUIDPipe) lockerId: string,
    @Body() dto: CreateChargingPortDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.ports.create(lockerId, dto, user, metadata(req));
  }

  @Get('charging-ports/:id')
  @RequirePermissions('charging_ports.read')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ports.get(id, user);
  }

  @Patch('charging-ports/:id')
  @RequirePermissions('charging_ports.configure')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChargingPortDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.ports.update(id, dto, user, metadata(req));
  }

  @Patch('charging-ports/:id/status')
  @RequirePermissions('charging_ports.configure')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChargingPortStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.ports.updateStatus(id, dto, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

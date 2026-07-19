import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../../common/constants/api.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import {
  CreateRoleDto,
  RoleQueryDto,
  SyncRolePermissionsDto,
  UpdateRoleDto,
  UpdateRoleStatusDto,
} from '../dto/role.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesService } from '../services/roles.service';

@ApiTags('roles')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('roles.manage')
@Controller({ path: 'roles', version: API_VERSION })
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(@Query() query: RoleQueryDto) {
    return this.roles.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.roles.create(dto, user, metadata(req));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.roles.update(id, dto, user, metadata(req));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.roles.updateStatus(id, dto, user, metadata(req));
  }

  @Get(':id/permissions')
  listPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.listPermissions(id);
  }

  @Put(':id/permissions')
  syncPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.roles.syncPermissions(id, dto, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

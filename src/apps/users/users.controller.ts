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
import {
  CreateUserDto,
  SetTemporaryPasswordDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'users', version: API_VERSION })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Query() query: UserQueryDto) {
    return this.users.list(query);
  }

  @Post()
  @RequirePermissions('users.create')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.users.create(dto, user, metadata(req));
  }

  @Get(':id')
  @RequirePermissions('users.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.users.update(id, dto, user, metadata(req));
  }

  @Patch(':id/status')
  @RequirePermissions('users.update')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.users.updateStatus(id, dto, user, metadata(req));
  }

  @Post(':id/set-temporary-password')
  @RequirePermissions('users.update')
  setTemporaryPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTemporaryPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.users.setTemporaryPassword(id, dto, user, metadata(req));
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

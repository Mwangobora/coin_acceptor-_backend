import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { API_VERSION } from '../../../common/constants/api.constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PermissionQueryDto } from '../dto/permission-query.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('permissions')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('roles.manage')
@Controller({ path: 'permissions', version: API_VERSION })
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  list(@Query() query: PermissionQueryDto) {
    return this.permissions.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissions.get(id);
  }
}

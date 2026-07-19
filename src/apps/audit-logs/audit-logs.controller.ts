import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../access-control/guards/permissions.guard';
import { PermissionService } from '../access-control/services/permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_VERSION } from '../../common/constants/api.constants';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('audit-logs')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit_logs.read')
@Controller({ path: 'audit-logs', version: API_VERSION })
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(@Query() query: AuditLogQueryDto) {
    return this.auditLogs.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogs.get(id);
  }
}

export const auditLogAuthorizationProviders = [
  PermissionService,
  PermissionsGuard,
];

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

import { API_VERSION } from '../../../common/constants/api.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../../auth/types/auth-request.type';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import {
  CreateRoleAssignmentDto,
  RevokeRoleAssignmentDto,
  RoleAssignmentQueryDto,
} from '../dto/role-assignment.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RoleAssignmentsService } from '../services/role-assignments.service';

@ApiTags('role-assignments')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('roles.manage')
@Controller({ version: API_VERSION })
export class RoleAssignmentsController {
  constructor(private readonly assignments: RoleAssignmentsService) {}

  @Get('role-assignments')
  list(@Query() query: RoleAssignmentQueryDto) {
    return this.assignments.list(query);
  }

  @Get('users/:userId/role-assignments')
  listForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: RoleAssignmentQueryDto,
  ) {
    return this.assignments.listForUser(userId, query);
  }

  @Post('users/:userId/role-assignments')
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateRoleAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.assignments.create(userId, dto, user, metadata(req));
  }

  @Post('users/:userId/role-assignments/:assignmentId/revoke')
  revoke(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: RevokeRoleAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthRequest,
  ) {
    return this.assignments.revoke(
      userId,
      assignmentId,
      dto,
      user,
      metadata(req),
    );
  }
}

function metadata(request: AuthRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent'),
    requestId: request.requestId,
  };
}

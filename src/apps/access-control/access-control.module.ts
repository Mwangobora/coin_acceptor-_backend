import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../database/prisma.module';
import { PermissionsController } from './controllers/permissions.controller';
import { RoleAssignmentsController } from './controllers/role-assignments.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionService } from './services/permission.service';
import { PermissionsService } from './services/permissions.service';
import { RoleAssignmentsService } from './services/role-assignments.service';
import { RolesService } from './services/roles.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogsModule],
  controllers: [
    RolesController,
    PermissionsController,
    RoleAssignmentsController,
  ],
  providers: [
    PermissionService,
    PermissionsGuard,
    PermissionsService,
    RolesService,
    RoleAssignmentsService,
  ],
  exports: [PermissionService, PermissionsGuard],
})
export class AccessControlModule {}

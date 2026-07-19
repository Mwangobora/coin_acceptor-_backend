import type { permissions, roles, user_role_assignments } from '@prisma/client';

import type {
  PermissionResponse,
  RoleAssignmentResponse,
  RoleResponse,
} from '../types/access-control-responses.type';

type AssignmentWithRole = user_role_assignments & {
  roles: { code: string };
};

export function mapPermission(permission: permissions): PermissionResponse {
  return {
    id: permission.id,
    code: permission.code,
    module: permission.module,
    action: permission.action,
    description: permission.description,
  };
}

export function mapRole(role: roles): RoleResponse {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystemRole: role.is_system_role,
    status: role.status,
    createdAt: role.created_at.toISOString(),
    updatedAt: role.updated_at.toISOString(),
  };
}

export function mapRoleAssignment(
  assignment: AssignmentWithRole,
): RoleAssignmentResponse {
  return {
    id: assignment.id,
    userId: assignment.user_id,
    roleId: assignment.role_id,
    roleCode: assignment.roles.code,
    stationId: assignment.station_id,
    assignedByUserId: assignment.assigned_by_user_id,
    assignedAt: assignment.assigned_at.toISOString(),
    expiresAt: assignment.expires_at?.toISOString() ?? null,
    revokedAt: assignment.revoked_at?.toISOString() ?? null,
    revokedByUserId: assignment.revoked_by_user_id,
    revocationReason: assignment.revocation_reason,
  };
}

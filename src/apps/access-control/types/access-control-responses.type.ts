export type PermissionResponse = {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string | null;
};

export type RoleResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type RoleAssignmentResponse = {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  stationId: string | null;
  assignedByUserId: string | null;
  assignedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revocationReason: string | null;
};

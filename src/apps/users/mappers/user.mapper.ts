import type { users } from '@prisma/client';

import type { UserResponse } from '../types/user-responses.type';

export function mapUser(user: users): UserResponse {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phoneNumber: user.phone_number,
    status: user.status,
    mustChangePassword: user.must_change_password,
    lastLoginAt: user.last_login_at?.toISOString() ?? null,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
    createdByUserId: user.created_by_user_id,
  };
}

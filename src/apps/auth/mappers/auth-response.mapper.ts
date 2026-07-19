import type {
  AuthSessionResponse,
  SafeUserResponse,
} from '../types/auth-responses.type';

type SafeUserInput = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  must_change_password: boolean;
};

type SessionInput = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date;
  revoked_at: Date | null;
};

export function mapSafeUser(user: SafeUserInput): SafeUserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    status: user.status,
    mustChangePassword: user.must_change_password,
  };
}

export function mapSession(
  session: SessionInput,
  currentSessionId: string,
): AuthSessionResponse {
  return {
    id: session.id,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    createdAt: session.created_at.toISOString(),
    lastUsedAt: session.last_used_at?.toISOString() ?? null,
    expiresAt: session.expires_at.toISOString(),
    currentSession: session.id === currentSessionId,
    revokedAt: session.revoked_at?.toISOString() ?? null,
  };
}

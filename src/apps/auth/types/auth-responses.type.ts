export type SafeUserResponse = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  mustChangePassword: boolean;
};

export type AuthSuccessResponse = {
  user: SafeUserResponse;
};

export type AuthMessageResponse = {
  message: string;
};

export type AuthSessionResponse = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  currentSession: boolean;
  revokedAt: string | null;
};

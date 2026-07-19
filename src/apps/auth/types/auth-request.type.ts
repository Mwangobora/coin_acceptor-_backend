import type { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.type';

export type AuthRequest = Request & {
  user: AuthenticatedUser;
  requestId?: string;
  cookies: Record<string, string | undefined>;
};

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

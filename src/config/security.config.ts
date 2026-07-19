import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  corsOrigin: process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  deviceAuthEnabled: process.env.DEVICE_AUTH_ENABLED === 'true',
  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT ?? '1mb',
}));

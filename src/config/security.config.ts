import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  corsOrigin: process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
  deviceAuthEnabled: process.env.DEVICE_AUTH_ENABLED === 'true',
  deviceCredentialEncryptionKey:
    process.env.DEVICE_CREDENTIAL_ENCRYPTION_KEY ??
    '0123456789abcdef0123456789abcdef',
  deviceHmacClockSkewSeconds: Number(
    process.env.DEVICE_HMAC_CLOCK_SKEW_SECONDS ?? 300,
  ),
  deviceEventMaxFutureSeconds: Number(
    process.env.DEVICE_EVENT_MAX_FUTURE_SECONDS ?? 300,
  ),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '7d',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  authMaxFailedAttempts: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
  authLockMinutes: Number(process.env.AUTH_LOCK_MINUTES ?? 15),
  authMinPasswordLength: Number(process.env.AUTH_MIN_PASSWORD_LENGTH ?? 12),
  requestSizeLimit: process.env.REQUEST_SIZE_LIMIT ?? '1mb',
}));

type Environment = 'development' | 'test' | 'production';

export type EnvironmentVariables = {
  APP_NAME: string;
  NODE_ENV: Environment;
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  SWAGGER_ENABLED: boolean;
  CORS_ORIGIN: string;
  COOKIE_SECURE: boolean;
  COOKIE_SAME_SITE: 'lax' | 'strict' | 'none';
  DEVICE_AUTH_ENABLED: boolean;
  DEVICE_CREDENTIAL_ENCRYPTION_KEY: string;
  DEVICE_HMAC_CLOCK_SKEW_SECONDS: number;
  DEVICE_EVENT_MAX_FUTURE_SECONDS: number;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
  AUTH_MAX_FAILED_ATTEMPTS: number;
  AUTH_LOCK_MINUTES: number;
  AUTH_MIN_PASSWORD_LENGTH: number;
  REQUEST_SIZE_LIMIT: string;
};

const environments = new Set(['development', 'test', 'production']);

function requireValue(config: Record<string, unknown>, key: string) {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function optionalString(
  config: Record<string, unknown>,
  key: string,
  defaultValue: string,
) {
  const value = config[key];
  if (value === undefined || value === '') return defaultValue;
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string.`);
  }
  return value;
}

function parsePort(value: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return port;
}

function parseUrl(value: string, key: string) {
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

function parseBoolean(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Boolean environment values must be true or false.');
}

function parsePositiveInt(value: unknown, key: string, defaultValue: number) {
  const raw =
    value === undefined || value === '' ? String(defaultValue) : value;
  if (typeof raw !== 'string') throw new Error(`${key} must be a number.`);
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return number;
}

function parseSameSite(value: unknown) {
  const raw = value === undefined || value === '' ? 'lax' : value;
  if (typeof raw !== 'string') {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  const sameSite = raw.toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
  }
  return sameSite as 'lax' | 'strict' | 'none';
}

function parseEncryptionKey(config: Record<string, unknown>, nodeEnv: string) {
  const fallback =
    nodeEnv === 'production' ? undefined : '0123456789abcdef0123456789abcdef';
  const value = optionalString(
    config,
    'DEVICE_CREDENTIAL_ENCRYPTION_KEY',
    fallback ?? '',
  );
  if (value.length !== 32) {
    throw new Error('DEVICE_CREDENTIAL_ENCRYPTION_KEY must be 32 characters.');
  }
  return value;
}

export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = requireValue(config, 'NODE_ENV');
  if (!environments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  return {
    APP_NAME: optionalString(config, 'APP_NAME', 'charging-system-api'),
    NODE_ENV: nodeEnv as Environment,
    HOST: optionalString(config, 'HOST', '0.0.0.0'),
    PORT: parsePort(requireValue(config, 'PORT')),
    API_PREFIX: requireValue(config, 'API_PREFIX').replace(/^\/|\/$/g, ''),
    FRONTEND_URL: parseUrl(
      requireValue(config, 'FRONTEND_URL'),
      'FRONTEND_URL',
    ),
    DATABASE_URL: parseUrl(
      requireValue(config, 'DATABASE_URL'),
      'DATABASE_URL',
    ),
    REDIS_URL: parseUrl(
      optionalString(config, 'REDIS_URL', 'redis://localhost:6379'),
      'REDIS_URL',
    ),
    SWAGGER_ENABLED: parseBoolean(
      config.SWAGGER_ENABLED,
      nodeEnv !== 'production',
    ),
    CORS_ORIGIN: parseUrl(
      optionalString(
        config,
        'CORS_ORIGIN',
        requireValue(config, 'FRONTEND_URL'),
      ),
      'CORS_ORIGIN',
    ),
    COOKIE_SECURE: parseBoolean(config.COOKIE_SECURE, nodeEnv === 'production'),
    COOKIE_SAME_SITE: parseSameSite(config.COOKIE_SAME_SITE),
    DEVICE_AUTH_ENABLED: parseBoolean(config.DEVICE_AUTH_ENABLED, false),
    DEVICE_CREDENTIAL_ENCRYPTION_KEY: parseEncryptionKey(config, nodeEnv),
    DEVICE_HMAC_CLOCK_SKEW_SECONDS: parsePositiveInt(
      config.DEVICE_HMAC_CLOCK_SKEW_SECONDS,
      'DEVICE_HMAC_CLOCK_SKEW_SECONDS',
      300,
    ),
    DEVICE_EVENT_MAX_FUTURE_SECONDS: parsePositiveInt(
      config.DEVICE_EVENT_MAX_FUTURE_SECONDS,
      'DEVICE_EVENT_MAX_FUTURE_SECONDS',
      300,
    ),
    JWT_ACCESS_SECRET: optionalString(
      config,
      'JWT_ACCESS_SECRET',
      'development-access-secret-change-me',
    ),
    JWT_REFRESH_SECRET: optionalString(
      config,
      'JWT_REFRESH_SECRET',
      'development-refresh-secret-change-me',
    ),
    JWT_ACCESS_TTL: optionalString(config, 'JWT_ACCESS_TTL', '7d'),
    JWT_REFRESH_TTL: optionalString(config, 'JWT_REFRESH_TTL', '30d'),
    AUTH_MAX_FAILED_ATTEMPTS: parsePositiveInt(
      config.AUTH_MAX_FAILED_ATTEMPTS,
      'AUTH_MAX_FAILED_ATTEMPTS',
      5,
    ),
    AUTH_LOCK_MINUTES: parsePositiveInt(
      config.AUTH_LOCK_MINUTES,
      'AUTH_LOCK_MINUTES',
      15,
    ),
    AUTH_MIN_PASSWORD_LENGTH: parsePositiveInt(
      config.AUTH_MIN_PASSWORD_LENGTH,
      'AUTH_MIN_PASSWORD_LENGTH',
      12,
    ),
    REQUEST_SIZE_LIMIT: optionalString(config, 'REQUEST_SIZE_LIMIT', '1mb'),
  } satisfies EnvironmentVariables;
}

type Environment = 'development' | 'test' | 'production';

export type EnvironmentVariables = {
  APP_NAME: string;
  NODE_ENV: Environment;
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  SWAGGER_ENABLED: boolean;
  CORS_ORIGIN: string;
  COOKIE_SECURE: boolean;
  DEVICE_AUTH_ENABLED: boolean;
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
    DEVICE_AUTH_ENABLED: parseBoolean(config.DEVICE_AUTH_ENABLED, false),
    REQUEST_SIZE_LIMIT: optionalString(config, 'REQUEST_SIZE_LIMIT', '1mb'),
  } satisfies EnvironmentVariables;
}

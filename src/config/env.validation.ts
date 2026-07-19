type Environment = 'development' | 'test' | 'production';

export type EnvironmentVariables = {
  NODE_ENV: Environment;
  PORT: number;
  API_PREFIX: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
};

const environments = new Set(['development', 'test', 'production']);

function requireValue(config: Record<string, unknown>, key: string) {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
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

export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = requireValue(config, 'NODE_ENV');
  if (!environments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  return {
    NODE_ENV: nodeEnv as Environment,
    PORT: parsePort(requireValue(config, 'PORT')),
    API_PREFIX: requireValue(config, 'API_PREFIX').replace(/^\/|\/$/g, ''),
    FRONTEND_URL: parseUrl(requireValue(config, 'FRONTEND_URL'), 'FRONTEND_URL'),
    DATABASE_URL: parseUrl(requireValue(config, 'DATABASE_URL'), 'DATABASE_URL'),
  } satisfies EnvironmentVariables;
}

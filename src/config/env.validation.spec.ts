import { validateEnv } from './env.validation';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '4000',
  API_PREFIX: 'api/v1',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://postgres:postgres@database:5432/app',
};

describe('validateEnv', () => {
  it('normalizes required environment values', () => {
    const env = validateEnv(validEnv);

    expect(env.PORT).toBe(4000);
    expect(env.API_PREFIX).toBe('api/v1');
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.DEVICE_AUTH_ENABLED).toBe(false);
  });

  it('fails clearly for invalid ports', () => {
    expect(() => validateEnv({ ...validEnv, PORT: '99999' })).toThrow(
      'PORT must be a valid TCP port.',
    );
  });
});

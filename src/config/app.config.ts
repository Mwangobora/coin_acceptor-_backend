import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME,
  nodeEnv: process.env.NODE_ENV,
  host: process.env.HOST,
  port: Number(process.env.PORT),
  apiPrefix: process.env.API_PREFIX,
  frontendUrl: process.env.FRONTEND_URL,
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
}));

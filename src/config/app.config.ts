import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.PORT),
  apiPrefix: process.env.API_PREFIX,
  frontendUrl: process.env.FRONTEND_URL,
  databaseUrl: process.env.DATABASE_URL,
}));

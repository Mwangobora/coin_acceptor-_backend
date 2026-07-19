import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { securityConfig } from './security.config';
import { validateEnv } from './env.validation';

export const ConfigModule = NestConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  load: [appConfig, databaseConfig, securityConfig],
  validate: validateEnv,
});

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { configureSwagger } from './bootstrap/configure-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const host = configService.getOrThrow<string>('app.host');
  const port = configService.getOrThrow<number>('app.port');

  configureApp(app);
  configureSwagger(app);

  await app.listen(port, host);
}

void bootstrap();

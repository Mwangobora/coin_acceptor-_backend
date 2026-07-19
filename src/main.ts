import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.getOrThrow<string>('app.apiPrefix');
  const frontendUrl = configService.getOrThrow<string>('app.frontendUrl');
  const port = configService.getOrThrow<number>('app.port');
  const nodeEnv = configService.getOrThrow<string>('app.nodeEnv');

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: nodeEnv === 'production' ? frontendUrl : [frontendUrl],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();

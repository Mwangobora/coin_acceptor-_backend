import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, Request, urlencoded } from 'express';
import helmet from 'helmet';

import { API_VERSION } from '../common/constants/api.constants';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { RequestIdInterceptor } from '../common/interceptors/request-id.interceptor';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const apiPrefix = config.getOrThrow<string>('app.apiPrefix');
  const corsOrigin = config.getOrThrow<string>('security.corsOrigin');
  const requestSizeLimit = config.getOrThrow<string>(
    'security.requestSizeLimit',
  );

  app.setGlobalPrefix(getGlobalPrefix(apiPrefix));
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: requestSizeLimit, verify: captureRawBody }));
  app.use(
    urlencoded({
      extended: true,
      limit: requestSizeLimit,
      verify: captureRawBody,
    }),
  );
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
}

type RequestWithRawBody = Request & { rawBody?: Buffer };

function captureRawBody(
  request: RequestWithRawBody,
  _response: unknown,
  buffer: Buffer,
): void {
  request.rawBody = Buffer.from(buffer);
}

function getGlobalPrefix(apiPrefix: string): string {
  return apiPrefix.replace(new RegExp(`/v${API_VERSION}$`), '');
}

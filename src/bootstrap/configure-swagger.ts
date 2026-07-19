import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);
  const swaggerEnabled = config.getOrThrow<boolean>('app.swaggerEnabled');
  if (!swaggerEnabled) return;

  const apiPrefix = config.getOrThrow<string>('app.apiPrefix');
  const port = config.getOrThrow<number>('app.port');
  const documentConfig = new DocumentBuilder()
    .setTitle('Charging System Admin API')
    .setDescription('REST API for admin monitoring and device integration.')
    .setVersion('1.0')
    .addServer(`http://localhost:${port}/${apiPrefix}`)
    .addCookieAuth('admin_session')
    .addBearerAuth()
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
  });
}

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';

describe('App health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '4000';
    process.env.API_PREFIX = 'api/v1';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@database:5432/app';

    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/bootstrap/configure-app');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('serves GET /api/v1/health', async () => {
    const server = app.getHttpServer() as Server;

    await request(server).get('/api/v1/health').expect(200);
  });
});

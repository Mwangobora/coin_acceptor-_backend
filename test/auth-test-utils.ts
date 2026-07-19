import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import type { Server } from 'node:http';

export const testDatabaseUrl =
  'postgresql://postgres:postgres@localhost:5432/charging_system_test?schema=charging_system';

export async function createTestApp(): Promise<{
  app: INestApplication;
  server: Server;
  prisma: PrismaClient;
}> {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '4000';
  process.env.API_PREFIX = 'api/v1';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_TTL = '7d';
  process.env.JWT_REFRESH_TTL = '30d';
  process.env.AUTH_MAX_FAILED_ATTEMPTS = '2';
  process.env.AUTH_LOCK_MINUTES = '15';
  process.env.AUTH_MIN_PASSWORD_LENGTH = '12';

  const { AppModule } = await import('../src/app.module');
  const { configureApp } = await import('../src/bootstrap/configure-app');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return {
    app,
    server: app.getHttpServer() as Server,
    prisma: new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } }),
  };
}

export async function createUser(
  prisma: PrismaClient,
  input: {
    email: string;
    password?: string;
    status?: string;
    mustChangePassword?: boolean;
  },
) {
  return prisma.users.create({
    data: {
      full_name: 'Test Admin',
      email: input.email,
      password_hash: String(
        await argon2.hash(input.password ?? 'CorrectPassword123!'),
      ),
      status: input.status ?? 'active',
      must_change_password: input.mustChangePassword ?? false,
    },
  });
}

export function cookieHeader(response: { headers: Record<string, unknown> }) {
  const header = response.headers['set-cookie'];
  if (!Array.isArray(header)) return '';
  return header.map((cookie) => String(cookie).split(';')[0]).join('; ');
}

export function setCookieHeader(response: {
  headers: Record<string, unknown>;
}): string {
  const header = response.headers['set-cookie'];
  if (!Array.isArray(header)) return '';
  return header.map((cookie) => String(cookie)).join(';');
}

export function cookieValue(header: string, name: string): string {
  const part = header
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`));
  return part?.slice(name.length + 1) ?? '';
}

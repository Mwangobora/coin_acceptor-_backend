import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  cookieHeader,
  setCookieHeader,
} from './auth-test-utils';

describe('Auth login APIs', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('sets HttpOnly cookies and never returns JWT values', async () => {
    await createUser(prisma, { email: 'login-ok@example.com' });

    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'login-ok@example.com', password: 'CorrectPassword123!' })
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain('token');
    expect(cookieHeader(response)).toContain('access_token=');
    expect(setCookieHeader(response)).toContain('HttpOnly');
  });

  it('uses a generic response and increments failed attempts', async () => {
    const user = await createUser(prisma, { email: 'wrong@example.com' });

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@example.com', password: 'bad-password' })
      .expect(401);

    const updated = await prisma.users.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(updated.failed_login_attempts).toBe(1);
  });

  it('locks an account after the configured threshold', async () => {
    const user = await createUser(prisma, { email: 'lock@example.com' });

    for (let index = 0; index < 2; index += 1) {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'lock@example.com', password: 'bad-password' });
    }

    const updated = await prisma.users.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(updated.locked_until).toBeInstanceOf(Date);
  });

  it('rejects inactive and suspended users', async () => {
    await createUser(prisma, {
      email: 'inactive@example.com',
      status: 'inactive',
    });
    await createUser(prisma, {
      email: 'suspended@example.com',
      status: 'suspended',
    });

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@example.com', password: 'CorrectPassword123!' })
      .expect(401);
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'suspended@example.com', password: 'CorrectPassword123!' })
      .expect(401);
  });

  it('requires authentication for /auth/me', async () => {
    await request(server).get('/api/v1/auth/me').expect(401);
  });
});

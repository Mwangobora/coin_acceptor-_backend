import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  cookieHeader,
  cookieValue,
  setCookieHeader,
} from './auth-test-utils';

describe('Auth session APIs', () => {
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

  async function login(email: string) {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'CorrectPassword123!' });
    return { response, cookies: cookieHeader(response) };
  }

  it('rotates refresh sessions and detects reuse', async () => {
    await createUser(prisma, { email: 'refresh@example.com' });
    const first = await login('refresh@example.com');
    const oldRefresh = cookieValue(first.cookies, 'refresh_token');

    const rotated = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', first.cookies)
      .expect(201);
    const newCookies = cookieHeader(rotated);

    expect(newCookies).toContain('refresh_token=');
    await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${oldRefresh}`)
      .expect(401);
    const user = await prisma.users.findUniqueOrThrow({
      where: { email: 'refresh@example.com' },
    });
    const sessions = await prisma.auth_sessions.findMany({
      where: { user_id: user.id },
    });
    expect(sessions.filter((session) => !session.revoked_at)).toHaveLength(0);
  });

  it('logs out and clears cookies', async () => {
    await createUser(prisma, { email: 'logout@example.com' });
    const { cookies } = await login('logout@example.com');

    const response = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(201);

    expect(setCookieHeader(response)).toContain('access_token=;');
    expect(await activeSessions('logout@example.com')).toBe(0);
  });

  it('revokes every user session on logout-all', async () => {
    await createUser(prisma, { email: 'logout-all@example.com' });
    const first = await login('logout-all@example.com');
    await login('logout-all@example.com');

    await request(server)
      .post('/api/v1/auth/logout-all')
      .set('Cookie', first.cookies)
      .expect(201);

    expect(await activeSessions('logout-all@example.com')).toBe(0);
  });

  it('does not revoke another user session', async () => {
    await createUser(prisma, { email: 'owner@example.com' });
    await createUser(prisma, { email: 'other@example.com' });
    const owner = await login('owner@example.com');
    await login('other@example.com');
    const otherSession = await sessionForEmail('other@example.com');

    await request(server)
      .delete(`/api/v1/auth/sessions/${otherSession.id}`)
      .set('Cookie', owner.cookies)
      .expect(200);

    const refreshed = await prisma.auth_sessions.findUniqueOrThrow({
      where: { id: otherSession.id },
    });
    expect(refreshed.revoked_at).toBeNull();
  });

  async function activeSessions(email: string) {
    const user = await prisma.users.findUniqueOrThrow({ where: { email } });
    return prisma.auth_sessions.count({
      where: { user_id: user.id, revoked_at: null },
    });
  }

  async function sessionForEmail(email: string) {
    const user = await prisma.users.findUniqueOrThrow({ where: { email } });
    return prisma.auth_sessions.findFirstOrThrow({
      where: { user_id: user.id },
    });
  }
});

import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { createTestApp, createUser, cookieHeader } from './auth-test-utils';

type MeResponse = { user: { email: string } };
type SessionResponse = { id: string; currentSession: boolean };

describe('Auth password and profile APIs', () => {
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
    return cookieHeader(response);
  }

  it('returns /me without sensitive hashes', async () => {
    await createUser(prisma, { email: 'me@example.com' });
    const cookies = await login('me@example.com');

    const response = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    const body = response.body as unknown as MeResponse;
    expect(body.user.email).toBe('me@example.com');
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
    expect(JSON.stringify(response.body)).not.toContain('refresh_token_hash');
  });

  it('lists safe sessions and supports current-session revoke', async () => {
    await createUser(prisma, { email: 'sessions@example.com' });
    const cookies = await login('sessions@example.com');

    const list = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookies)
      .expect(200);
    const sessions = list.body as unknown as SessionResponse[];
    expect(typeof sessions[0].id).toBe('string');
    expect(sessions[0].currentSession).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain('refresh_token_hash');

    await request(server)
      .delete(`/api/v1/auth/sessions/${sessions[0].id}`)
      .set('Cookie', cookies)
      .expect(200);
  });

  it('rejects an incorrect current password', async () => {
    await createUser(prisma, { email: 'bad-current@example.com' });
    const cookies = await login('bad-current@example.com');

    await request(server)
      .patch('/api/v1/auth/change-password')
      .set('Cookie', cookies)
      .send({
        currentPassword: 'wrong',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })
      .expect(401);
  });

  it('changes password and revokes all sessions', async () => {
    await createUser(prisma, { email: 'change@example.com' });
    const cookies = await login('change@example.com');
    await login('change@example.com');

    await request(server)
      .patch('/api/v1/auth/change-password')
      .set('Cookie', cookies)
      .send({
        currentPassword: 'CorrectPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })
      .expect(200);

    expect(await activeSessions('change@example.com')).toBe(0);
  });

  it('allows only me, change-password and logout when password must change', async () => {
    await createUser(prisma, {
      email: 'must-change@example.com',
      mustChangePassword: true,
    });
    const cookies = await login('must-change@example.com');

    await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get('/api/v1/auth/sessions')
      .set('Cookie', cookies)
      .expect(403);
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(201);
  });

  async function activeSessions(email: string) {
    const user = await prisma.users.findUniqueOrThrow({ where: { email } });
    return prisma.auth_sessions.count({
      where: { user_id: user.id, revoked_at: null },
    });
  }
});

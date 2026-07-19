import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import {
  createTestApp,
  createUser,
  grantPermissions,
  loginCookies,
} from './auth-test-utils';

const allManagementPermissions = [
  'users.read',
  'users.create',
  'users.update',
  'roles.manage',
  'audit_logs.read',
];

describe('Management APIs', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let server: Parameters<typeof request>[0];
  let cookies: string;
  let adminId: string;

  beforeAll(async () => {
    ({ app, prisma, server } = await createTestApp());
    const admin = await createUser(prisma, { email: 'manager@example.com' });
    adminId = admin.id;
    await grantPermissions(prisma, admin.id, allManagementPermissions);
    cookies = await loginCookies(server, 'manager@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated and unauthorized management requests', async () => {
    await request(server).get('/api/v1/users').expect(401);
    const user = await createUser(prisma, { email: 'noperms@example.com' });
    const noPermCookies = await loginCookies(server, 'noperms@example.com');

    await request(server)
      .get('/api/v1/users')
      .set('Cookie', noPermCookies)
      .expect(403);
    expect(user.id).toBeDefined();
  });

  it('implements user administration without exposing password hashes', async () => {
    const created = await request(server)
      .post('/api/v1/users')
      .set('Cookie', cookies)
      .send({
        fullName: 'Created Admin',
        email: 'created-admin@example.com',
        temporaryPassword: 'Temporary123!',
      })
      .expect(201);
    const userId = (created.body as { id: string }).id;

    await request(server)
      .post('/api/v1/users')
      .set('Cookie', cookies)
      .send({
        fullName: 'Duplicate',
        email: 'created-admin@example.com',
        temporaryPassword: 'Temporary123!',
      })
      .expect(409);
    await request(server)
      .get(`/api/v1/users/${userId}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/users/${userId}`)
      .set('Cookie', cookies)
      .send({ phoneNumber: '+255700000000' })
      .expect(200);
    await request(server)
      .post(`/api/v1/users/${userId}/set-temporary-password`)
      .set('Cookie', cookies)
      .send({ temporaryPassword: 'AnotherTemp123!' })
      .expect(201);
    const list = await request(server)
      .get('/api/v1/users?page=1&pageSize=10&search=created&status=active')
      .set('Cookie', cookies)
      .expect(200);

    expect(JSON.stringify([created.body, list.body])).not.toContain(
      'password_hash',
    );
  });

  it('protects self and last super-admin status changes', async () => {
    await request(server)
      .patch(`/api/v1/users/${adminId}/status`)
      .set('Cookie', cookies)
      .send({ status: 'suspended', reason: 'test' })
      .expect(403);
    const role = await prisma.roles.create({
      data: { code: 'super_admin', name: 'Super Admin', status: 'active' },
    });
    await prisma.user_role_assignments.create({
      data: { user_id: adminId, role_id: role.id },
    });

    await request(server)
      .patch(`/api/v1/users/${adminId}/status`)
      .set('Cookie', cookies)
      .send({ status: 'inactive', reason: 'test' })
      .expect(403);
  });

  it('implements role and permission management endpoints', async () => {
    const permission = await prisma.permissions.findFirstOrThrow({
      where: { code: 'users.read' },
    });
    const role = await request(server)
      .post('/api/v1/roles')
      .set('Cookie', cookies)
      .send({ code: 'support_admin', name: 'Support Admin' })
      .expect(201);
    const roleId = (role.body as { id: string }).id;

    await request(server)
      .get('/api/v1/roles')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/roles/${roleId}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/roles/${roleId}`)
      .set('Cookie', cookies)
      .send({ name: 'Support Lead', code: 'ignored' })
      .expect(400);
    await request(server)
      .put(`/api/v1/roles/${roleId}/permissions`)
      .set('Cookie', cookies)
      .send({ permissionIds: [permission.id] })
      .expect(200);
    await request(server)
      .get(`/api/v1/roles/${roleId}/permissions`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get('/api/v1/permissions')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/permissions/${permission.id}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .post('/api/v1/permissions')
      .set('Cookie', cookies)
      .expect(404);
  });

  it('implements global and station-scoped role assignment revocation', async () => {
    const user = await createUser(prisma, { email: 'assignee@example.com' });
    const permission = await prisma.permissions.findFirstOrThrow({
      where: { code: 'users.read' },
    });
    const role = await prisma.roles.create({
      data: {
        code: `assignable_${Date.now()}`,
        name: 'Assignable Role',
        status: 'active',
        role_permissions: { create: { permission_id: permission.id } },
      },
    });
    const station = await prisma.stations.create({
      data: {
        code: 'STATION_TEST',
        name: 'Station Test',
        station_type: 'brt_station',
        region: 'Dar',
        status: 'active',
      },
    });

    const created = await request(server)
      .post(`/api/v1/users/${user.id}/role-assignments`)
      .set('Cookie', cookies)
      .send({ roleId: role.id })
      .expect(201);
    const assignmentId = (created.body as { id: string }).id;

    await request(server)
      .post(`/api/v1/users/${user.id}/role-assignments`)
      .set('Cookie', cookies)
      .send({ roleId: role.id })
      .expect(409);
    await request(server)
      .post(`/api/v1/users/${user.id}/role-assignments`)
      .set('Cookie', cookies)
      .send({ roleId: role.id, stationId: station.id })
      .expect(201);
    await request(server)
      .get('/api/v1/role-assignments')
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .get(`/api/v1/users/${user.id}/role-assignments`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .post(`/api/v1/users/${user.id}/role-assignments/${assignmentId}/revoke`)
      .set('Cookie', cookies)
      .send({ reason: 'test' })
      .expect(201);
  });

  it('implements read-only audit-log endpoints with sanitized values', async () => {
    const log = await prisma.audit_logs.findFirstOrThrow({
      where: { actor_user_id: adminId },
      orderBy: { occurred_at: 'desc' },
    });

    const list = await request(server)
      .get('/api/v1/audit-logs')
      .set('Cookie', cookies)
      .expect(200);
    const one = await request(server)
      .get(`/api/v1/audit-logs/${log.id}`)
      .set('Cookie', cookies)
      .expect(200);
    await request(server)
      .patch(`/api/v1/audit-logs/${log.id}`)
      .set('Cookie', cookies)
      .expect(404);

    expect(JSON.stringify([list.body, one.body])).not.toMatch(
      /password_hash|refresh_token_hash|temporaryPassword|access_token|refresh_token/,
    );
  });
});

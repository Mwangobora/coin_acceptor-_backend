import { Prisma } from '@prisma/client';

import { permissionCodes, rolePermissionMap, roleRows } from './seed-core-data';
import {
  countRows,
  createPrismaClient,
  hashSecret,
  insertRows,
  requireSeedEnv,
} from './seed-utils';

async function main() {
  const prisma = createPrismaClient();
  const adminName = requireSeedEnv('SEED_ADMIN_NAME');
  const adminEmail = requireSeedEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const passwordHash = await hashSecret(requireSeedEnv('SEED_ADMIN_PASSWORD'));

  try {
    const roles = roleRows.map(([code, name, description]) => ({
      code,
      name,
      description,
      is_system_role: true,
      status: 'active',
    }));
    const permissions = permissionCodes.map((code) => {
      const [module, action] = code.split('.');
      return { code, module, action, description: `${action} ${module}` };
    });

    const insertedRoles = await insertRows(prisma, 'roles', roles, 'code');
    const insertedPermissions = await insertRows(
      prisma,
      'permissions',
      permissions,
      'code',
    );
    const insertedAdmin = await insertAdmin(
      prisma,
      adminName,
      adminEmail,
      passwordHash,
    );

    await assignRolePermissions(prisma, 'super_admin', permissionCodes);
    for (const [roleCode, codes] of Object.entries(rolePermissionMap)) {
      await assignRolePermissions(prisma, roleCode, codes);
    }
    await assignAdminRole(prisma, adminEmail);

    console.log(`Core roles inserted: ${insertedRoles}`);
    console.log(`Core permissions inserted: ${insertedPermissions}`);
    console.log(`Initial admin inserted: ${insertedAdmin}`);
    console.log(`Core users total: ${await countRows(prisma, 'users')}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function insertAdmin(
  prisma: ReturnType<typeof createPrismaClient>,
  name: string,
  email: string,
  passwordHash: string,
): Promise<number> {
  const result = await prisma.$executeRaw(Prisma.sql`
    insert into charging_system.users (full_name, email, password_hash, status)
    values (${name}, ${email}, ${passwordHash}, 'active')
    on conflict (email) do update set full_name = excluded.full_name;
  `);
  return Number(result);
}

async function assignRolePermissions(
  prisma: ReturnType<typeof createPrismaClient>,
  roleCode: string,
  codes: string[],
): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    insert into charging_system.role_permissions (role_id, permission_id)
    select roles.id, permissions.id
    from charging_system.roles
    cross join charging_system.permissions
    where roles.code = ${roleCode}
    and permissions.code in (${Prisma.join(codes)})
    on conflict (role_id, permission_id) do nothing;
  `);
}

async function assignAdminRole(
  prisma: ReturnType<typeof createPrismaClient>,
  email: string,
): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    insert into charging_system.user_role_assignments (user_id, role_id)
    select users.id, roles.id
    from charging_system.users
    cross join charging_system.roles
    where users.email = ${email}::public.citext and roles.code = 'super_admin'
    on conflict do nothing;
  `);
}

void main();

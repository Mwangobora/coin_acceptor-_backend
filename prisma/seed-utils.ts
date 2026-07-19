import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

export type SeedRow = Record<
  string,
  string | number | boolean | Date | null | object
>;

const nonUuidColumns = new Set([
  'external_event_id',
  'idempotency_key',
  'key_id',
  'provider_transaction_id',
  'request_id',
]);

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ],
  });
}

export function requireSeedEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required seed environment variable: ${key}`);
  }
  return value;
}

export async function hashSecret(value: string): Promise<string> {
  return String(await argon2.hash(value, { type: argon2.argon2id }));
}

export async function insertRow(
  prisma: PrismaClient,
  table: string,
  row: SeedRow,
  conflictTarget = 'id',
): Promise<number> {
  const columns = Object.keys(row);
  const values = columns.map((column) => valueSql(column, row[column]));
  const conflictClause =
    conflictTarget.length > 0
      ? Prisma.sql`on conflict (${Prisma.raw(conflictTarget)}) do nothing`
      : Prisma.sql`on conflict do nothing`;
  const result = await prisma.$executeRaw(Prisma.sql`
    insert into charging_system.${Prisma.raw(table)}
    (${Prisma.join(columns.map((column) => Prisma.raw(column)))})
    values (${Prisma.join(values)})
    ${conflictClause};
  `);

  return Number(result);
}

function valueSql(column: string, value: SeedRow[string]): Prisma.Sql {
  if (column === 'value_json') {
    return Prisma.sql`${JSON.stringify(value)}::jsonb`;
  }

  if (isJsonValue(value)) {
    return Prisma.sql`${JSON.stringify(value)}::jsonb`;
  }

  if (isUuidColumn(column)) {
    return Prisma.sql`${value}::uuid`;
  }

  return Prisma.sql`${value}`;
}

function isJsonValue(value: SeedRow[string]): boolean {
  return (
    typeof value === 'object' && value !== null && !(value instanceof Date)
  );
}

function isUuidColumn(column: string): boolean {
  return (
    (column === 'id' || column.endsWith('_id')) && !nonUuidColumns.has(column)
  );
}

export async function insertRows(
  prisma: PrismaClient,
  table: string,
  rows: SeedRow[],
  conflictTarget = 'id',
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    inserted += await insertRow(prisma, table, row, conflictTarget);
  }
  return inserted;
}

export async function countRows(
  prisma: PrismaClient,
  table: string,
  where = Prisma.empty,
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    select count(*)::bigint as count
    from charging_system.${Prisma.raw(table)}
    ${where};
  `);

  return Number(result[0]?.count ?? 0);
}

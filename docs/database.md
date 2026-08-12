# Database

## Source Of Truth

`charging_system_source_of_truth.sql` is the authoritative PostgreSQL schema.
Do not rewrite it manually into Prisma models, and do not use `prisma db push`.
Future schema changes must be reviewed SQL migrations.

The database name is `charging_system`. The PostgreSQL schema is also
`charging_system`.

## Start PostgreSQL

```bash
docker compose up -d database
```

For a fresh Docker volume, PostgreSQL applies the SQL file automatically through
`/docker-entrypoint-initdb.d/001-charging-system-schema.sql`.

## Apply Existing SQL

Initialization files run only for a new volume. To apply the schema manually to
an empty existing development database:

```bash
npm run db:schema:apply
```

The command refuses to reapply the SQL when the schema already contains tables.

## Apply Schema To A Remote Database (Render, etc.)

Managed Postgres instances (Render, RDS, etc.) do not run
`docker-entrypoint-initdb.d`, so a freshly provisioned production database has
no tables until you apply the schema to it directly. Deploying the app without
doing this first fails with Prisma error `P2021` (table does not exist).

```bash
DATABASE_URL="<external-connection-string>?schema=charging_system" \
  npm run db:schema:apply:remote
```

Use the provider's *external* connection string (the one reachable from your
machine, not the internal one meant for services in the same private
network). The `?schema=charging_system` suffix matters: the SQL file creates
everything under the `charging_system` schema, and without that suffix Prisma
defaults to `public` and will not find the tables even after they exist. Set
the same `DATABASE_URL` (including the `?schema=charging_system` suffix) as
the web service's environment variable so the running app looks in the right
place.

The command refuses to reapply the SQL when the target schema already
contains tables, same as `db:schema:apply`. It also works without `psql`
installed locally — it falls back to running `psql` through
`docker run postgres:16-alpine` if the binary isn't found on your `PATH`.

## Verify Schema

```bash
npm run db:schema:verify
```

The verification checks the `charging_system` schema, the 23 expected tables,
`pgcrypto`, `citext`, triggers, and the connected database name.

## Prisma Client

Prisma is the application data-access client. It does not own schema creation.
Use introspection against the existing database:

```bash
npm run db:introspect
npm run db:generate
```

Prisma currently does not fully represent PostgreSQL check constraints or
database comments. PostgreSQL remains the enforcement layer for those rules.
The generated schema also keeps two Prisma-only logical unique annotations for
composite relation generation on `coin_insertions` and `device_telemetry`; these
do not change the database. The `db:introspect` script reapplies those
annotations after `prisma db pull`.

## Seed Data

Core data is required operational data: roles, permissions, role assignments,
and the first super administrator.

```bash
SEED_ADMIN_NAME="System Administrator" \
SEED_ADMIN_EMAIL="admin@example.com" \
SEED_ADMIN_PASSWORD="change-this-development-password" \
npm run db:seed:core
```

Demonstration data is development-only sample data for UI and admin workflows:

```bash
SEED_ADMIN_EMAIL="admin@example.com" npm run db:seed:demo
```

Run both in development:

```bash
SEED_ADMIN_NAME="System Administrator" \
SEED_ADMIN_EMAIL="admin@example.com" \
SEED_ADMIN_PASSWORD="change-this-development-password" \
npm run db:seed
```

Core and demo seeds are intentionally separate. Demo data must not run
automatically in production.

## Reset Development Database

Reset deletes the Docker PostgreSQL development volume. It is protected by an
explicit confirmation variable:

```bash
CONFIRM_DB_RESET=delete-development-data npm run db:reset
```

After reset, start PostgreSQL again and apply/introspect/generate.

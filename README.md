# Coin Acceptor Backend

NestJS API foundation for the QR-code and coin-based mobile phone charging
system.

Docker is configured here, inside `coin_acceptor_backend`, for the backend API
and PostgreSQL only. The Next.js admin app in `../coin_acceptor_web` runs
separately with npm.

## Start Backend Services

```bash
docker compose up --build
```

Detached mode:

```bash
docker compose up --build -d
```

View logs:

```bash
docker compose logs -f
```

Stop containers:

```bash
docker compose down
```

Delete development data:

```bash
docker compose down -v
```

## Services

- Backend: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health`
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs-json`
- PostgreSQL: `localhost:5432`

## Architecture

The backend uses a feature-first modular monolith. Current real modules are
`health` and `device-ingestion`; planned modules are documented in
`docs/backend-architecture.md`.

Device communication decisions that still need embedded-team confirmation are
documented in `docs/device-integration-contract.md`.

## Validation

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run check:lines
docker compose config
```

## Frontend

Run the frontend separately:

```bash
cd ../coin_acceptor_web
npm run dev
```

Use `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1` for local frontend
requests.

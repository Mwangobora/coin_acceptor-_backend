# Backend Architecture

## Style

This backend is a modular monolith using feature-first NestJS modules. Each
business capability owns its module, controllers, services, DTOs, types, tests,
and future persistence code.

Layer-first folders such as `src/controllers` or `src/services` are avoided
because they split one feature across the project.

## Folder Responsibilities

- `src/bootstrap`: application startup wiring such as validation, middleware,
  Swagger, CORS, versioning, and graceful shutdown hooks.
- `src/common`: shared API contracts, constants, filters, interceptors, DTOs,
  types, and small utilities that are not owned by one feature.
- `src/config`: all process environment access and validation.
- `src/apps`: feature modules and their owned files.
- `test`: end-to-end test configuration and e2e specs.
- `docs`: architecture and integration documentation.

## Current Modules

- `health`: reports backend health for Docker and operators.
- `device-ingestion`: defines the future device communication boundary.

## Planned Modules

- `auth`: admin login, logout, session or token management, and guards.
- `users`: admin/operator accounts, profiles, status, and roles.
- `stations`: physical charging locations and station configuration.
- `devices`: embedded units, identifiers, firmware, status, and last seen time.
- `charging-sessions`: lifecycle, ports, progress, and termination.
- `payments`: coin and QR/mobile-money payment status and references.
- `lockers`: locker state, access events, and emergency access.
- `alerts`: faults, offline alerts, security events, acknowledgement.
- `reports`: revenue, usage, session, payment-method, and device reports.
- `audit-logs`: sensitive admin action history.
- `settings`: prices, duration packages, thresholds, and system settings.

## Controllers

Controllers receive HTTP requests, bind route parameters and DTOs, call services,
and return HTTP responses. They must not contain persistence, report
calculations, payment processing, or device-processing rules.

## Services

Services contain application use cases and business coordination. A service
should stay focused on one feature and should not become a catch-all for the
whole system.

## DTO And Validation

Incoming request bodies and query strings use DTO classes, not TypeScript
interfaces, because DTO classes are available at runtime. Global validation uses
`transform`, `whitelist`, and `forbidNonWhitelisted`.

## Module Dependencies

A feature imports another feature module only when it needs an exported provider.
Internal files from another module must not be imported directly. Export only
providers that are intentionally consumed by other modules.

Avoid circular dependencies and do not use `forwardRef` as a normal design tool.

## Device Ingestion Boundary

Device ingestion is a transport boundary for embedded-device communication. It
will authenticate devices, validate device events, reject duplicates, and route
accepted events to the owning business module.

It must not own all payment, charging-session, locker, or alert business rules.
Those rules belong in their feature modules.

Planned device route convention:

- `/api/v1/device-events/heartbeat`
- `/api/v1/device-events/telemetry`
- `/api/v1/device-events/power`
- `/api/v1/device-events/locker`
- `/api/v1/device-events/session`
- `/api/v1/device-events/payment`
- `/api/v1/device-events/alert`

## Admin API Boundary

The Next.js admin frontend will use protected resource endpoints such as
`/api/v1/stations`, `/api/v1/devices`, `/api/v1/payments`, and
`/api/v1/reports`. Admin resource operations must not be exposed through device
controllers.

## Request Flows

Embedded device -> Device-ingestion controller -> DTO validation -> Device
authentication -> Device-ingestion service -> Owning business module ->
Persistence -> Response to device

Next.js frontend -> Feature controller -> DTO validation ->
Authentication/authorization -> Feature service -> Persistence -> Typed REST
response

## Error Format

Errors use one structure:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [],
  "path": "/api/v1/example",
  "requestId": "request-id",
  "timestamp": "ISO timestamp"
}
```

Stack traces and sensitive internals must not be exposed in production.

## Pagination Format

Shared paginated responses use:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

## Configuration

`@nestjs/config` is global and cached. Namespaces are `app`, `database`, and
`security`. Feature services should not read `process.env` directly.

## Adding A Module

Create a folder under `src/apps/<feature>`. Add the module, controller,
service, DTOs, types, and tests only when they have real content. Register the
module in `AppModule` after its boundary is clear.

## File Length

Manually maintained TypeScript, JavaScript, and script files must stay within
120 lines. Extract DTOs, constants, types, child services, or utilities before a
file grows too large.

## Testing

Tests focus on application behavior: services, DTO validation, environment
validation, filters, and route-level e2e checks. Do not test NestJS internals or
create fake business persistence.

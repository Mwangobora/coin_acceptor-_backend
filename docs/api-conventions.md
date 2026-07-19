# API Conventions

## Versioning

REST endpoints are exposed under `/api/v1`. URI versioning is enabled so future
API versions can coexist without restructuring modules.

## Successful Responses

Return normal resource responses. Do not wrap success responses in extra nested
objects unless pagination or metadata is needed.

## Errors

Errors include `statusCode`, `code`, `message`, `errors`, `path`, `requestId`,
and `timestamp`. Validation failures use `VALIDATION_ERROR`.

## Request IDs

Clients may send `X-Request-ID`. If absent, the backend generates one and
returns it in the response header. This helps trace admin requests, device
events, failed payments, and device faults.

## Pagination

List endpoints should use `page`, `pageSize`, `sortBy`, and `sortOrder` query
parameters. `pageSize` defaults to 20 and must not exceed 100.

## Swagger

Swagger UI is available in development at `/docs`. The OpenAPI JSON document is
available at `/docs-json`.

# API Guide

This guide is a quick operational reference across Ripplemark services.

## Base URLs (local)

- Auth Gateway: `http://localhost:3000`
- Topology Service: `http://localhost:3001`
- Analysis Service: `http://localhost:8000`
- Registry Service: `http://localhost:8001`

## Endpoint Quick Reference

### Auth Gateway

- `POST /auth/login` — issue access and refresh tokens
- `POST /auth/refresh` — rotate access token
- `POST /auth/logout` — invalidate refresh token
- `GET /users` — list users
- `GET /health` — health check

### Topology Service

- `POST /api/v1/ingestion/services` — register a service
- `POST /api/v1/ingestion/dependencies` — register a dependency edge
- `GET /api/v1/query/services` — list services
- `GET /api/v1/query/dependencies` — list dependencies
- `GET /api/v1/query/path/{sourceId}/{targetId}` — shortest path
- `GET /health` — health check

### Analysis Service

- `POST /analysis/impact` — synchronous impact analysis
- `POST /analysis/impact/async` — queued analysis
- `GET /analysis/impact/results/{analysisId}` — async result lookup
- `POST /simulation/run` — what-if simulation
- `GET /health/live` — health check

Async analysis note:

- Async results are stored in-memory with bounded retention.
- Polling `/analysis/impact/results/{analysisId}` returns `pending` or `complete`.
- Expired entries may return `404` and should be treated as no longer available.

### Registry Service

- `GET /api/services/` — list services (supports filters)
- `POST /api/services/` — register service
- `GET /api/services/{serviceId}/` — service details
- `GET /api/teams/` — list teams
- `GET /api/snapshots/` — list snapshots
- `GET /health/live` — health check

## Authentication Flow Walkthrough

1. Client sends credentials to `POST /auth/login`.
2. Gateway returns `accessToken` + `refreshToken`.
3. Client calls protected endpoints with header:
   - `Authorization: Bearer <accessToken>`
4. On access token expiry, client calls `POST /auth/refresh`.
5. For logout/session invalidation, client calls `POST /auth/logout`.

## Key Workflow cURL Examples

## 1) Login and capture token

```bash
ACCESS_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"integration-admin@ripplemark.local","password":"IntegrationPass123!"}' | jq -r .accessToken)

echo "$ACCESS_TOKEN"
```

## 2) Register service in Registry

```bash
curl -X POST http://localhost:8001/api/services/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "auth-gateway",
    "name": "auth-gateway",
    "type": "api",
    "teamId": "platform",
    "status": "healthy",
    "version": "1.0.0"
  }'
```

## 3) Add nodes/edges in Topology

```bash
curl -X POST http://localhost:3001/api/v1/ingestion/services \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "web-app",
    "name": "web-app",
    "version": "1.0.0",
    "type": "sync",
    "metadata": {"team": "ui", "status": "healthy"}
  }'

curl -X POST http://localhost:3001/api/v1/ingestion/dependencies \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "web-app",
    "target": "auth-gateway",
    "type": "http"
  }'
```

## 4) Run impact analysis

```bash
curl -X POST http://localhost:8000/analysis/impact \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "service_name": "auth-gateway",
    "change_type": "schema_change",
    "details": "Login response contract update",
    "max_depth": 4
  }'
```

## 5) Query path from topology

```bash
curl -X GET "http://localhost:3001/api/v1/query/path/web-app/registry-service" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Contract Sources

Canonical API contracts are maintained in:

- `libs/api-contracts/auth-api.yaml`
- `libs/api-contracts/topology-api.yaml`
- `libs/api-contracts/analysis-api.yaml`
- `libs/api-contracts/registry-api.yaml`

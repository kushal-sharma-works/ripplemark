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

- `GET /api/v1/graph/nodes` — list nodes
- `POST /api/v1/graph/nodes` — create node
- `GET /api/v1/graph/edges` — list edges
- `POST /api/v1/graph/edges` — create edge
- `GET /api/v1/query/path?from={serviceA}&to={serviceB}` — shortest path
- `GET /health` — health check

### Analysis Service

- `POST /analysis/impact` — synchronous impact analysis
- `POST /analysis/impact/async` — queued analysis
- `GET /analysis/impact/results/{analysisId}` — async result lookup
- `POST /simulation/run` — what-if simulation
- `GET /health` — health check

### Registry Service

- `GET /api/services/` — list services (supports filters)
- `POST /api/services/` — register service
- `GET /api/services/{serviceId}/` — service details
- `GET /api/teams/` — list teams
- `GET /api/snapshots/` — list snapshots
- `GET /api/snapshots/diff/?left={id}&right={id}` — diff snapshots

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
  -d '{"email":"admin@ripplemark.io","password":"Password123!"}' | jq -r .accessToken)

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
curl -X POST http://localhost:3001/api/v1/graph/nodes \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "web-app",
    "name": "web-app",
    "type": "frontend",
    "teamId": "ui",
    "status": "healthy",
    "version": "1.0.0"
  }'

curl -X POST http://localhost:3001/api/v1/graph/edges \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "web-app",
    "target": "auth-gateway",
    "type": "sync"
  }'
```

## 4) Run impact analysis

```bash
curl -X POST http://localhost:8000/analysis/impact \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "serviceId": "auth-gateway",
    "changeType": "api",
    "title": "Login response update",
    "description": "Add tenantId in auth response"
  }'
```

## 5) Query path from topology

```bash
curl -X GET "http://localhost:3001/api/v1/query/path?from=web-app&to=registry-service" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Contract Sources

Canonical API contracts are maintained in:

- `libs/api-contracts/auth-api.yaml`
- `libs/api-contracts/topology-api.yaml`
- `libs/api-contracts/analysis-api.yaml`
- `libs/api-contracts/registry-api.yaml`

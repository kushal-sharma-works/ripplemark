# Onboarding Guide

## Prerequisites

Install the following locally before starting:

- Node.js 22.x
- Python 3.12
- Docker (with Compose v2)
- kubectl
- Helm 3.x
- Git

## 1) Clone and bootstrap

```bash
git clone https://github.com/kushal-sharma-works/ripplemark.git
cd ripplemark
```

## 2) Run local platform with Docker Compose

```bash
cd infra/docker
cp .env.example .env
docker compose -f docker-compose.yml up --build
```

Expected local ports:

- Web App: `http://localhost:4200`
- Auth Gateway: `http://localhost:3000`
- Topology Service: `http://localhost:3001`
- Analysis Service: `http://localhost:8000`
- Registry Service: `http://localhost:8001`

## 3) Run integration-test stack (ephemeral data)

```bash
cd infra/docker
docker compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

## 4) Run each service individually

### Topology Service (NestJS)

```bash
cd apps/topology-service
npm install
npm run start:dev
```

### Auth Gateway (NestJS)

```bash
cd apps/auth-gateway
npm install
npm run start:dev
```

### Analysis Service (FastAPI)

```bash
cd apps/analysis-service
uv sync --dev
uv run uvicorn analysis_service.main:app --reload --port 8000
```

### Registry Service (Django)

```bash
cd apps/registry-service
uv sync --dev
uv run python registry/manage.py migrate
uv run python registry/manage.py runserver 0.0.0.0:8001
```

### Web App (Angular)

```bash
cd apps/web-app
npm install
npm run start
```

## 5) Run tests

### Topology Service

```bash
cd apps/topology-service
npm run test
npm run test:cov
```

### Auth Gateway

```bash
cd apps/auth-gateway
npm run test
npm run test:e2e
npm run test:cov
```

### Analysis Service

```bash
cd apps/analysis-service
uv run pytest
uv run pytest --cov
```

### Registry Service

```bash
cd apps/registry-service
uv run pytest
uv run pytest --cov
```

### Web App

```bash
cd apps/web-app
npm run test
npm run test:cov
```

## 6) Swagger / API docs access

- Auth Gateway Swagger: `http://localhost:3000/api`
- Topology Service Swagger: `http://localhost:3001/api`
- Analysis Service Swagger (FastAPI docs): `http://localhost:8000/docs`
- Registry Service: DRF API root at `http://localhost:8001/api/`
- Canonical OpenAPI contracts: `libs/api-contracts/*.yaml`

## 7) Common troubleshooting

### Docker compose fails with port already in use
- Stop conflicting local services or change port values in `infra/docker/.env`.

### Service cannot connect to dependency
- Verify all infra services are healthy (`docker compose ps`).
- Check `REDIS_URL`, `DATABASE_URL`, `MONGODB_URI`, and `NATS_URL` env values.

### Python env issues
- Recreate environment with `uv sync --dev`.
- Ensure Python 3.12 is active.

### Node dependency mismatch
- Remove `node_modules` and reinstall (`npm install`).
- Check Node version is 22.x.

### Auth failures (401/403)
- Ensure JWT secret and gateway auth env vars are consistent.
- Verify token issuance via `/auth/login` before calling protected endpoints.

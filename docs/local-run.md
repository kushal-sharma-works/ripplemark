# Local Run Guide

This guide is the canonical way to run Ripplemark locally.

## Prerequisites

- Docker Engine + Docker Compose v2
- Git
- Optional (for service-by-service development):
  - Node.js 20.x LTS
  - Python 3.12
  - `uv` (`pip install uv` or installer from Astral)

## Option A (Recommended): Run entire platform with Docker Compose

```bash
git clone https://github.com/kushal-sharma-works/ripplemark.git
cd ripplemark/infra/docker
cp .env.example .env
docker compose -f docker-compose.yml up --build
```

Local endpoints:

- Web App: `http://localhost:4200`
- Auth Gateway: `http://localhost:3000`
- Topology Service: `http://localhost:3001`
- Analysis Service: `http://localhost:8000`
- Registry Service: `http://localhost:8001`

Default local login (email/password fallback):

- Email: `integration-admin@ripplemark.local`
- Password: `IntegrationPass123!`

These can be changed in `infra/docker/.env` using:

- `LOCAL_DEFAULT_USER_EMAIL`
- `LOCAL_DEFAULT_USER_PASSWORD`
- `LOCAL_DEFAULT_USER_DISPLAY_NAME`

Google login status for local:

- Do not use Google login in local runs (currently not reliable for local testing).
- Use the default email/password credentials above.

Stop and remove stack:

```bash
docker compose -f docker-compose.yml down -v --remove-orphans
```

## Option B: Run integration test stack (ephemeral data)

```bash
cd infra/docker
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

## Option C: Run services individually (without Docker app containers)

Start infrastructure first (Postgres, MongoDB, Redis, NATS), then run each service:

### Topology Service

```bash
cd apps/topology-service
npm install
npm run start:dev
```

### Auth Gateway

```bash
cd apps/auth-gateway
npm install
npm run start:dev
```

### Analysis Service

```bash
cd apps/analysis-service
uv sync --dev
uv run uvicorn analysis_service.main:app --reload --port 8000
```

### Registry Service

```bash
cd apps/registry-service
uv sync --dev
uv run python registry/manage.py migrate
uv run python registry/manage.py runserver 0.0.0.0:8001
```

### Web App

```bash
cd apps/web-app
npm install
npm run start
```

## Health and Smoke Checks

From repo root:

```bash
make smoke
```

Manual checks:

```bash
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:8000/health/live
curl -fsS http://localhost:8001/health/live
```

## Google Login Setup

Google OAuth setup docs are kept for reference only:

- [docs/google-oauth-local-setup.md](google-oauth-local-setup.md)

For day-to-day local testing, use email/password fallback credentials.

## Run Test Suites

From repo root:

```bash
make test
```

Or per service:

- `apps/topology-service`: `npm test`
- `apps/auth-gateway`: `npm test`
- `apps/analysis-service`: `uv run pytest`
- `apps/registry-service`: `uv run pytest`
- `apps/web-app`: `npm test`

## Common Issues

- Port conflicts: adjust values in `infra/docker/.env`.
- Docker healthcheck waits: use `docker compose ps` and `docker compose logs <service>`.
- Python dependency issues: rerun `uv sync --dev` in each Python service.
- Node issues: ensure Node 20.x LTS.
# Local Infrastructure

## Run all services locally

```bash
cp .env.example .env
docker compose -f docker-compose.yml up --build
```

## Run integration-test stack

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

The test override uses ephemeral database storage and avoids persistent volumes.

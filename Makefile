SHELL := /bin/bash

.PHONY: dev test lint build clean

dev:
	cd infra/docker && cp -n .env.example .env || true && docker compose -f docker-compose.yml up --build

test:
	cd apps/topology-service && npm test
	cd apps/auth-gateway && npm test
	cd apps/analysis-service && uv run pytest
	cd apps/registry-service && uv run pytest
	cd apps/web-app && npm test
	cd tests/integration && INTEGRATION_MANAGE_COMPOSE=1 pytest -q

lint:
	cd apps/topology-service && npm run lint
	cd apps/auth-gateway && npm run lint
	cd apps/analysis-service && uv run ruff check . && uv run ruff format --check .
	cd apps/registry-service && uv run ruff check . && uv run ruff format --check .
	cd apps/web-app && npm run lint

build:
	docker build -t ripplemark/topology-service:local apps/topology-service
	docker build -t ripplemark/auth-gateway:local apps/auth-gateway
	docker build -t ripplemark/analysis-service:local apps/analysis-service
	docker build -t ripplemark/registry-service:local apps/registry-service
	docker build -t ripplemark/web-app:local apps/web-app

clean:
	cd infra/docker && docker compose -f docker-compose.yml -f docker-compose.test.yml down -v --remove-orphans
	docker image prune -f

# Auth Gateway

NestJS 11 auth gateway for Ripplemark.

## Features
- JWT auth with refresh token rotation in Redis
- OAuth2 Google auth code flow
- RBAC + team access guard
- Reverse proxy routing to topology/analysis/registry services
- PostgreSQL user storage via TypeORM
- Health checks, Swagger, throttling, Helmet, CORS

## Run
```bash
npm install
npm run start:dev
```

## Test
```bash
npm test
npm run test:e2e
npm run test:cov
```

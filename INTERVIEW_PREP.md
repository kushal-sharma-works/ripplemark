# Ripplemark — Interview Preparation Guide

> **Purpose:** Prepare you for every possible question — non‑technical *and* technical — about this repository.  
> **Approach:** Short, memorable answers first, then deeper follow‑ups if they keep digging.

---

## Table of Contents

1. [Non‑Technical Questions](#1-non-technical-questions)
2. [Architecture & Design Questions](#2-architecture--design-questions)
3. [Technology Choice Questions](#3-technology-choice-questions)
4. [Code‑Level Technical Questions](#4-code-level-technical-questions)
5. [Infrastructure & DevOps Questions](#5-infrastructure--devops-questions)
6. [Testing Questions](#6-testing-questions)
7. [Security Questions](#7-security-questions)
8. [Scalability & Performance Questions](#8-scalability--performance-questions)
9. [Worst‑Case Rapid‑Fire Questions](#9-worst-case-rapid-fire-questions)
10. [Angular Deep Dive](#10-angular-deep-dive)
11. [Docker & Containerisation](#11-docker--containerisation)
12. [Error Handling & Resilience](#12-error-handling--resilience)
13. [Observability Deep Dive](#13-observability-deep-dive)
14. [Data Model & Database Deep Dive](#14-data-model--database-deep-dive)
15. [API Endpoint Reference](#15-api-endpoint-reference)
16. [Environment Variables Reference](#16-environment-variables-reference)
17. [Gotcha & Trick Questions](#17-gotcha--trick-questions)
18. [Behavioural & Soft‑Skill Questions](#18-behavioural--soft-skill-questions)
19. [File‑by‑File Walkthrough](#19-file-by-file-walkthrough)

---

## 1. Non‑Technical Questions

### Q: Why the name "Ripplemark"?

**A:** A ripplemark is a pattern left in sand by flowing water — one small change creates ripples that spread outward. That is exactly what happens in a microservice ecosystem: one change in a service *ripples* through its dependents. The platform visualises and predicts those ripples — the name *is* the product.

---

### Q: What problem does Ripplemark solve?

**A:** In a microservice world you can have 50–200+ services. When you change one, you need to know *what breaks downstream*. Today teams find out in production via incidents. Ripplemark gives you a **live dependency graph**, **change‑impact analysis with risk scores**, and **blast‑radius estimation** *before* you deploy — preventing outages rather than reacting to them.

---

### Q: Who is this for?

**A:** Platform engineering teams, SREs, and architects who maintain large service ecosystems. Think any company past 15–20 microservices where manual dependency tracking stops working.

---

### Q: Why did you build this?

**A:** I saw the gap first‑hand: service maps were spreadsheets or Confluence pages that were always stale. Every on‑call incident started with "which services does X depend on?" I wanted an *always‑live* answer to that question plus proactive risk scoring.

---

### Q: Why a monorepo?

**A:** Three reasons:

1. **Atomic changes** — a contract change in `libs/api-contracts` plus consuming code ships in one PR.
2. **Unified CI** — one pipeline tests cross‑service integration.
3. **Shared tooling** — linting, formatting, and common types are configured once.

*(Documented in ADR‑001.)*

---

### Q: Why did you use multiple languages (TypeScript + Python)?

**A:** Best tool for the job:

| Service | Language | Why |
|---|---|---|
| Auth Gateway | TypeScript/NestJS | Middleware‑oriented, strong typing, great for proxying |
| Topology | TypeScript/NestJS | WebSocket support, guards, modules — ideal for real‑time graph API |
| Analysis | Python/FastAPI | Graph algorithms (NetworkX), scientific libs, async I/O |
| Registry | Python/Django | Mature ORM, migrations, battle‑tested for CRUD catalogues |
| Web App | TypeScript/Angular | Enterprise component library (PrimeNG), strong typing |

---

### Q: Why not just use one language everywhere?

**A:** I could, but each service has different demands. Forcing Django into real‑time WebSockets or forcing NestJS to use NetworkX for graph simulations adds accidental complexity. Polyglot lets each service be idiomatic and maintainable.

---

### Q: How long did this take?

**A:** Core architecture and MVP took a few focused weeks. The hardest parts were the graph algorithms in the topology service and getting the real‑time WebSocket updates working reliably.

---

### Q: Why microservices instead of a monolith?

**A:** The product *models* microservice ecosystems — building it as microservices gives me:

- **Dog‑fooding** — I literally use Ripplemark to track Ripplemark's own services.
- **Independent scaling** — the topology service gets more load than the registry.
- **Tech flexibility** — Python analysis engine, TypeScript web layer.

---

### Q: What would you do differently?

**A:** Two things:

1. **Start with the API contracts earlier** — I would define OpenAPI specs before writing any service code (contract‑first).
2. **Add end‑to‑end browser tests sooner** — I focused on unit and integration tests first; adding Playwright E2E earlier would have caught UI regressions faster.

---

### Q: How do you handle disagreements on technical decisions?

**A:** I document the decision, the alternatives I rejected, and the trade‑offs in an **Architecture Decision Record (ADR)**. There are eight ADRs in `docs/decisions/`. When someone challenges a choice, I point to the record — it removes emotion and keeps the discussion data‑driven.

---

### Q: What is your proudest technical achievement in this project?

**A:** The **real‑time dependency graph with live blast‑radius calculation**. You register a service, its node appears on every connected client's graph in under 200 ms via WebSocket, and you can immediately query its blast radius using Tarjan's algorithm. Getting that pipeline from ingestion → persistence → broadcast → D3 rendering to be both correct and fast was the biggest challenge.

---

## 2. Architecture & Design Questions

### Q: Walk me through the architecture.

**A:**

```
Browser (Angular 19)
   │
   ▼
Auth Gateway (NestJS :3000) ── JWT + RBAC ──┐
   │                                         │
   ├──► Topology Service (NestJS :3001)      │
   │       └─ MongoDB + Redis + WebSocket    │
   │                                         │
   ├──► Analysis Service (FastAPI :8000)     │
   │       └─ Redis (result caching)         │
   │                                         │
   └──► Registry Service (Django :8001)      │
           └─ PostgreSQL                     │
                                             │
           NATS (async messaging) ◄──────────┘
```

**One sentence:** The browser talks to the Auth Gateway, which authenticates, enriches headers, and proxies to the three backend services, each with its own database optimised for its workload.

---

### Q: Why is the Auth Gateway separate?

**A:** It is the **single entry point** that handles:

- JWT issuance and refresh (including refresh token rotation via Redis)
- Google OAuth integration
- Role‑based and team‑based access control
- Reverse proxying with header enrichment (user ID, roles, teams, trace ID)
- Prometheus metrics on proxied requests

Centralising auth means downstream services never handle credentials — they trust the enriched headers.

---

### Q: How does the proxy work?

**A:** The `ProxyMiddleware` in the auth gateway:

1. Extracts and verifies the Bearer JWT.
2. Maps the URL prefix to a target service (`/api/topology → topology-service:3001`).
3. Injects identity headers: `X-User-Id`, `X-User-Roles`, `X-User-Teams`, `X-Request-Id`.
4. Pipes the request/response using `http-proxy-middleware`.
5. Records Prometheus metrics for latency and status code.

---

### Q: Why three separate databases?

**A:**

| Database | Service | Reason |
|---|---|---|
| **PostgreSQL** | Auth Gateway + Registry | Relational data (users, teams, ownership) requires ACID guarantees and foreign keys |
| **MongoDB** | Topology | Graph snapshots are deeply nested documents; flexible schema handles evolving node/edge metadata |
| **Redis** | Auth (tokens) + Analysis (cache) + Topology (cache) | Sub‑millisecond reads for tokens, cached query results, and graph stats |

*(Documented in ADR‑005.)*

---

### Q: Why NATS and not Kafka?

**A:**

- **Low latency** — NATS is an in‑memory message bus, ideal for real‑time graph update notifications.
- **Operational simplicity** — single binary, no ZooKeeper, trivial local setup.
- **Right scale** — we need fast fan‑out, not durable event sourcing. If we needed replay and exactly‑once processing, Kafka would be the answer.

*(Documented in ADR‑006.)*

---

### Q: How does data flow when a service is registered?

**A:**

1. `POST /api/v1/ingestion/services` hits the Topology Service.
2. `IngestionController` validates the DTO and calls `GraphService.addNode()`.
3. The in‑memory adjacency map is updated.
4. `GraphGateway` broadcasts a `graph_update` event via WebSocket (Socket.io).
5. `PersistenceService` periodically snapshots the graph to MongoDB.
6. Every connected Angular client's D3 visualisation updates in real time.

---

### Q: How does impact analysis work?

**A:**

1. A **Change Proposal** is sent to `POST /analysis/impact`.
2. The Analysis Service fetches the current graph from the Topology Service.
3. `ImpactAnalysisEngine` performs a **BFS traversal** from the changed service, collecting all downstream dependents up to a max depth.
4. For each affected service it calculates a **risk score (0–100)** based on:
   - Change type severity (e.g., breaking API change = 40, config change = 10)
   - Service criticality multiplier (1–5×)
   - Traversal depth penalty
5. Returns a list of affected services, risk scores, and human‑readable recommendations.

---

### Q: What is the blast radius?

**A:** The set of services *directly or transitively impacted* by a change. The topology service computes it by combining:

- **Forward traversal** — everything the changed service depends on.
- **Reverse traversal** — everything that depends on the changed service.

Result: a full set of services that are "in the blast zone."

---

## 3. Technology Choice Questions

### Q: Why NestJS?

**A:** Four reasons:

1. **Modular architecture** — guards, interceptors, pipes, and providers mirror enterprise patterns.
2. **First‑class WebSocket support** — critical for real‑time graph updates.
3. **TypeScript throughout** — compile‑time safety across the API surface.
4. **Ecosystem** — Passport strategies, TypeORM, Swagger generation.

*(ADR‑002.)*

---

### Q: Why FastAPI for the analysis service?

**A:**

1. **Python graph libraries** — NetworkX for failure simulation, Hypothesis for property‑based testing.
2. **Async I/O** — non‑blocking calls to fetch the graph from the topology service.
3. **Pydantic** — automatic request validation identical to the OpenAPI spec.
4. **Rapid iteration** — minimal boilerplate for algorithm‑heavy code.

*(ADR‑003.)*

---

### Q: Why Django for the registry instead of FastAPI?

**A:** The registry is a classic CRUD catalogue — services, teams, ownership, versions. Django's ORM, migration framework, and admin panel are purpose‑built for exactly this. FastAPI is great for algorithms but Django is better for relational data management.

*(ADR‑004.)*

---

### Q: Why Angular and not React?

**A:**

1. **Opinionated framework** — routing, forms, HTTP, DI are built in; no library shopping.
2. **Signals** — Angular 19 signals replaced NgRx boilerplate (ADR‑007).
3. **PrimeNG** — rich component library (data tables, charts) that integrates natively.
4. **Enterprise readiness** — strict typing, AoT compilation, tree shaking.

---

### Q: Why D3.js for the graph visualisation?

**A:** D3 gives full control over the force‑directed layout — I can customise node appearance by service type, edge thickness by dependency weight, and add hover tooltips with metadata. Higher‑level chart libraries do not support interactive, zoomable, draggable force graphs.

---

### Q: Why MongoDB for graph storage?

**A:** A graph snapshot is a tree of nested objects — nodes contain metadata maps, edges contain latency/weight/type fields. MongoDB's document model stores this naturally without joins. Schema changes (adding a field to nodes) require zero migrations.

*(ADR‑005.)*

---

### Q: Why Signals over NgRx?

**A:** NgRx adds actions, reducers, selectors, and effects — four files per feature. Signals achieve the same reactivity with computed properties and effects in a single file. For Ripplemark's scope, NgRx was over‑engineering.

*(ADR‑007.)*

---

### Q: Why ArgoCD for deployment?

**A:** **GitOps principle**: the Git repo is the single source of truth for desired cluster state. ArgoCD watches the `infra/` directory and auto‑syncs Kubernetes manifests. Every deployment is a Git commit — auditable, reversible, reproducible.

*(ADR‑008.)*

---

## 4. Code‑Level Technical Questions

### Q: Explain the GraphService in the topology service.

**A:** It is the **brain of the platform**. Key data structures:

- `nodes: Map<string, ServiceNode>` — adjacency map of all services.
- `edges: Map<string, DependencyEdge>` — all dependencies with type, weight, latency.

Key algorithms:

| Method | Algorithm | Complexity |
|---|---|---|
| `detectCycles()` | Tarjan's SCC | O(V + E) |
| `topologicalSort()` | Kahn's Algorithm | O(V + E) |
| `getTransitiveDependencies()` | BFS with depth limit | O(V + E) |
| `shortestPath()` | BFS (unweighted) | O(V + E) |
| `blastRadius()` | Forward + reverse BFS | O(V + E) |

---

### Q: How does cycle detection work?

**A:** I use **Tarjan's algorithm** for finding Strongly Connected Components (SCCs):

1. DFS with a stack, assigning each node an index and a low‑link value.
2. When a node's low‑link equals its index, everything on the stack above it forms an SCC.
3. Any SCC with more than one node is a cycle.
4. Returns all cycles as arrays of service IDs.

**Why Tarjan?** It finds *all* cycles in one O(V + E) pass, not just one.

---

### Q: How does topological sort work?

**A:** **Kahn's algorithm:**

1. Compute in‑degree for every node.
2. Enqueue all nodes with in‑degree 0.
3. Dequeue a node, add to result, decrement in‑degree of neighbours.
4. If any neighbour reaches in‑degree 0, enqueue it.
5. If the result length ≠ node count → cycles exist → return `null`.

**Use case:** Determines safe deployment order — deploy services with no dependencies first.

---

### Q: How does the risk scoring work?

**A:** The `ImpactAnalysisEngine` computes a score 0–100:

```
base_score  = severity_base + (depth_penalty × hop_distance)
final_score = min(base_score × criticality_multiplier, 100)
```

Where:

- `severity_base` comes from the change type (breaking API = 40, deprecation = 25, config = 10).
- `depth_penalty` adds risk for each hop (services further downstream are harder to predict).
- `criticality_multiplier` is a 1–5× weight based on service importance.

---

### Q: What does the compatibility checker do?

**A:** It validates whether an API schema change is **breaking** or **safe**:

| Change | Verdict |
|---|---|
| Field removed | ❌ Breaking |
| Field type changed | ❌ Breaking |
| Optional → Required | ❌ Breaking |
| Field added | ✅ Safe |
| Required → Optional | ✅ Safe |

It compares old and new OpenAPI schemas field by field and returns a list of breaking changes with explanations.

---

### Q: How does the simulation engine work?

**A:** It uses **NetworkX** (Python graph library) to model cascading failures:

1. Builds a directed graph from the dependency data.
2. **Cascade probability** — calculates the likelihood that a failure propagates through the graph.
3. **Latency impact** — sums average latencies along dependency chains.
4. **Timeout chain length** — identifies the longest path where cumulative latency could cause timeouts.

Returns three metrics that help teams decide if a change is safe.

---

### Q: How does the WebSocket real‑time update work?

**A:** The `GraphGateway` in the topology service uses **Socket.io** (on top of WebSockets):

1. Clients connect and join a `graph_updates` room.
2. When a node or edge is added/removed, `handleGraphUpdate()` is called.
3. It broadcasts a `graph_update` event with the full or delta payload.
4. The Angular `WebSocketService` receives it and updates the D3 visualisation.

The connection handles auto‑reconnection and authentication via JWT.

---

### Q: How does the Angular frontend render the graph?

**A:** The `GraphPage` component:

1. On init, fetches all nodes and edges from `GET /api/topology/query/export`.
2. Maps raw API data to strongly‑typed `ServiceNode[]` and `DependencyEdge[]`.
3. Passes them to a `GraphCanvasComponent` which uses D3's `forceSimulation`:
   - `forceLink` for edges
   - `forceManyBody` for repulsion
   - `forceCenter` for centering
4. Nodes are SVG circles coloured by service type; edges are lines.
5. WebSocket events add/remove nodes and edges in real time without full reload.

---

### Q: How does the auth flow work?

**A:**

1. User sends `POST /auth/login` with email + password.
2. `AuthService.validateCredentials()` compares bcrypt hashes.
3. On success, issues a **JWT access token** (short‑lived) and a **refresh token** (stored in Redis with TTL).
4. Client stores tokens and sends the access token as `Authorization: Bearer <token>`.
5. When the access token expires, client calls `POST /auth/refresh` with the refresh token.
6. Server validates the refresh token in Redis, **rotates it** (invalidates old, issues new), and returns fresh tokens.
7. On logout, the refresh token is deleted from Redis.

**Token rotation** prevents replay attacks — each refresh token can only be used once.

---

### Q: How does RBAC work?

**A:** Four roles in a hierarchy:

```
admin > team_lead > engineer > viewer
```

- **`RolesGuard`** — checks if the user's role meets the minimum required role for the endpoint (e.g., `@Roles('admin')` on user management).
- **`TeamAccessGuard`** — checks if the user belongs to the team that owns the resource. Admins bypass team checks.
- Both guards use custom decorators (`@Roles()`, `@TeamAccess()`) that set metadata read by the guards.

---

### Q: Explain the proxy middleware in detail.

**A:** `ProxyMiddleware` in the auth gateway:

```
Request → Extract JWT → Verify → Identify target service → Enrich headers → Proxy
```

1. Checks if the path starts with `/api/topology`, `/api/analysis`, or `/api/registry`.
2. Verifies the JWT and extracts user claims.
3. Sets headers: `X-User-Id`, `X-User-Roles`, `X-User-Teams`, `X-Request-Id` (for tracing).
4. For the registry service, injects a service‑to‑service token.
5. Pipes the full request (body, query params, method) to the target service.
6. Records Prometheus metrics (request count, latency histogram, status codes).

---

### Q: How does the persistence service work?

**A:** The `PersistenceService` in the topology service:

1. On startup, loads the latest graph snapshot from MongoDB.
2. `GraphService` operates on the **in‑memory graph** for speed.
3. Every N seconds (configurable), the persistence service calls `graphService.exportGraph()` and saves a versioned snapshot to MongoDB.
4. Snapshots include a version number, timestamp, and the full node/edge maps.
5. On crash recovery, the latest snapshot is loaded and the in‑memory graph is rebuilt.

---

### Q: What does the registry service manage?

**A:** It is the **source of truth** for service metadata:

- **Services** — name, type (API/worker/gateway), status, description.
- **Versions** — version history per service, with a "current" flag (unique constraint ensures only one current version).
- **Teams** — groups with members, each member having a role (owner/maintainer/viewer).
- **Ownership** — maps services to teams with an ownership type.
- **Snapshots** — point‑in‑time captures of the dependency graph for comparison.

---

### Q: What are the API contracts?

**A:** OpenAPI 3.1 YAML specs in `libs/api-contracts/` for all four services. They define:

- Request/response schemas with examples.
- Shared models: `ServiceNode`, `DependencyEdge`, `ChangeProposal`, `RiskScore`.
- Error formats with standard status codes.
- Authentication requirements (Bearer JWT).

Contracts are the **source of truth** for inter‑service communication — code must match the spec.

---

## 5. Infrastructure & DevOps Questions

### Q: How do you run the project locally?

**A:** Three options:

1. **Full stack:** `make dev` → spins up Docker Compose with all 5 services + all databases.
2. **Integration test stack:** `docker compose -f docker-compose.test.yml up` → databases only, run services locally.
3. **Individual service:** `cd apps/<service> && npm run start:dev` (or `uv run uvicorn main:app --reload` for Python).

---

### Q: Describe the CI/CD pipeline.

**A:**

**CI (on every PR to main):**
1. Path‑based change detection (only test what changed).
2. Matrix build: NestJS services (Node 20), Python services (Python 3.12).
3. Angular lint + test.
4. Helm chart validation (`helm lint`).
5. Security scans (dependency audit, SAST).

**CD (on merge to main):**
1. Build Docker images, tag with commit SHA.
2. Push to container registry.
3. ArgoCD detects new image tags and syncs to Kubernetes.

---

### Q: Explain the Helm charts.

**A:** Each service has a Helm chart in `infra/helm/` with:

- `Deployment` — container spec, env vars from ConfigMaps/Secrets, resource limits.
- `Service` — ClusterIP for internal communication.
- `Ingress` — external access rules.
- `ConfigMap` — non‑secret configuration.
- `HPA` — Horizontal Pod Autoscaler based on CPU/memory.

Values are environment‑specific (`values-dev.yaml`, `values-prod.yaml`).

---

### Q: How does ArgoCD work in this project?

**A:** ArgoCD watches the `infra/argocd/` directory:

1. Each `Application` manifest points to a Helm chart + values file.
2. When a commit changes the chart or values, ArgoCD auto‑syncs.
3. It performs health checks and auto‑rolls back on failure.
4. All deployments are Git commits — full audit trail.

---

### Q: How do you handle environment configuration?

**A:** Environment variables with validation:

- **NestJS services** — Joi schema validation on startup (fails fast if config is missing).
- **Python services** — Pydantic `BaseSettings` with `.env` file support.
- **Local dev** — `.env.example` copied to `.env`.
- **Production** — Kubernetes Secrets and ConfigMaps.

---

### Q: What observability is built in?

**A:**

| Layer | Tool |
|---|---|
| Logging | Pino (structured JSON) |
| Metrics | Prometheus (custom counters + histograms) |
| Tracing | OpenTelemetry (distributed trace IDs) |
| Health | Liveness + readiness probes on every service |

The proxy middleware propagates `X-Request-Id` through all services for distributed tracing.

---

## 6. Testing Questions

### Q: What is your testing strategy?

**A:** Three layers:

| Layer | Tools | Coverage |
|---|---|---|
| **Unit** | Jest (TS), Pytest (Python) | 70–80% threshold |
| **Integration** | Docker Compose + cross‑service tests | End‑to‑end flows |
| **Property‑based** | Hypothesis (Python) | Graph algorithm edge cases |

---

### Q: How many tests are there?

**A:** ~53 test files total:

- 33 TypeScript spec files (Jest) — auth, topology, web app.
- 18 Python test files (Pytest) — analysis, registry.
- 2 integration test files — cross‑service flows.

---

### Q: What do the integration tests cover?

**A:** `tests/integration/test_cross_service.py`:

1. Authenticates against the auth gateway.
2. Registers services in the topology service.
3. Adds dependencies and queries the graph.
4. Runs impact analysis via the analysis service.
5. Creates snapshots in the registry and compares them.

Uses Docker Compose to spin up the full stack with health‑check waits.

---

### Q: Why property‑based testing for the analysis engine?

**A:** Graph algorithms have subtle edge cases (empty graphs, single‑node graphs, fully connected graphs, disconnected components). **Hypothesis** generates random valid graphs and verifies invariants like:

- Risk score is always 0–100.
- The analysis engine output matches a NetworkX reference implementation.

This finds bugs that manually written test cases miss.

---

### Q: How do you test the WebSocket gateway?

**A:** `graph.gateway.spec.ts`:

1. Creates a mock Socket.io server.
2. Simulates client connections and `subscribe` events.
3. Calls `handleGraphUpdate()` and verifies the emitted event payload.
4. Tests disconnection cleanup and room management.

---

## 7. Security Questions

### Q: How do you handle authentication?

**A:** Dual strategy:

1. **Email/password** — bcrypt‑hashed passwords, JWT issuance.
2. **Google OAuth 2.0** — Passport Google strategy, auto‑creates users on first OAuth login.

JWT access tokens are short‑lived; refresh tokens are stored in Redis with TTL and **rotated on every use** (each token works once).

---

### Q: How do you prevent common attacks?

**A:**

| Attack | Mitigation |
|---|---|
| **XSS** | Helmet middleware (security headers) |
| **CSRF** | JWT in Authorization header (not cookies) |
| **Brute force** | Rate limiting / throttling on auth endpoints |
| **Token replay** | Refresh token rotation — each token is single‑use |
| **Injection** | Parameterised queries (TypeORM, Django ORM) |
| **CORS** | Strict origin allowlist |

---

### Q: How do refresh tokens work?

**A:**

1. On login, a refresh token JTI (unique ID) is stored in Redis with a TTL.
2. On refresh, the server checks Redis for the JTI.
3. If valid: deletes the old JTI, issues new access + refresh tokens, stores the new JTI.
4. If invalid/expired: returns 401 — user must log in again.

**Why rotation?** If a refresh token is stolen, the attacker can use it once. The legitimate user's next refresh fails, alerting them.

---

### Q: How does team‑based access control work?

**A:** The `TeamAccessGuard`:

1. Reads the `@TeamAccess()` decorator to get the required role.
2. Extracts the team ID from the request (route param or body).
3. Checks if the user is a member of that team with sufficient role.
4. Admins bypass all team checks.
5. Team leads can manage their own teams but not others.

---

## 8. Scalability & Performance Questions

### Q: What are the performance bottlenecks?

**A:**

1. **Graph size** — Tarjan's and BFS are O(V + E), so even 10,000 services with 50,000 edges run in milliseconds.
2. **MongoDB snapshots** — large graphs produce large documents. Mitigated by periodic (not per‑operation) persistence.
3. **WebSocket fan‑out** — broadcasting to thousands of clients. Mitigated by Socket.io rooms (only subscribers receive updates).

---

### Q: How would you scale each service?

**A:**

| Service | Scaling Strategy |
|---|---|
| **Auth Gateway** | Horizontal (stateless JWT verification, Redis‑backed sessions) |
| **Topology** | Vertical first (in‑memory graph), then shard by namespace/tenant |
| **Analysis** | Horizontal (stateless computation, Redis result caching) |
| **Registry** | Horizontal (PostgreSQL read replicas) |

---

### Q: Why is the graph in‑memory?

**A:** Graph traversal algorithms need constant‑time node/edge lookups. Querying MongoDB for every BFS step would add network latency per hop. The in‑memory graph gives **O(1) lookups** and **sub‑millisecond traversals**. MongoDB is the persistence layer, not the query engine.

---

### Q: What happens if the topology service crashes?

**A:** On restart:

1. `PersistenceService.onModuleInit()` loads the latest snapshot from MongoDB.
2. The in‑memory graph is rebuilt from the snapshot.
3. WebSocket clients auto‑reconnect (Socket.io handles this).
4. At most you lose changes since the last periodic snapshot (configurable interval).

---

### Q: How would you handle multi‑tenancy?

**A:** Add a `tenantId` field to every node and edge. Partition the graph by tenant. Each API call is scoped by the tenant extracted from the JWT. MongoDB queries filter by tenant. This isolates data without deploying separate stacks.

---

## 9. Worst‑Case Rapid‑Fire Questions

### Q: What does `main.ts` do in each NestJS service?

**A:** Bootstraps the NestJS application: creates the app instance, applies global pipes (validation), enables CORS, configures Swagger docs, and starts listening on the configured port.

---

### Q: What is `forRoot()` vs `forRootAsync()` in NestJS modules?

**A:** `forRoot()` takes static config. `forRootAsync()` takes a factory that can inject `ConfigService` — necessary when config comes from environment variables loaded at runtime.

---

### Q: Why TypeORM and not Prisma?

**A:** TypeORM was chosen for its decorator‑based entity model that mirrors NestJS's pattern. The auth gateway has simple relational data (users, teams) — either ORM works. TypeORM's migration system is sufficient.

---

### Q: What is the `uv` package manager?

**A:** `uv` is a fast Python package manager written in Rust (by the Astral team, same as Ruff). It replaces `pip` + `venv` with a single tool that is 10–100× faster. Used for the Python services via `uv sync --dev`.

---

### Q: What is Ruff?

**A:** A Python linter and formatter written in Rust. It replaces flake8, isort, black, and pyflakes in a single tool. Configured in `pyproject.toml` for both Python services.

---

### Q: Why Pino for logging?

**A:** Pino produces structured JSON logs with minimal overhead — critical for production observability. JSON logs are parseable by log aggregators (ELK, Datadog). It is the fastest Node.js logger.

---

### Q: What does `pyrightconfig.json` do?

**A:** Configures Pyright (Python type checker) for the Python services. Sets strict mode, include paths, and exclude patterns. Ensures type safety in FastAPI and Django code.

---

### Q: What are the coverage thresholds?

**A:**

- **Angular (Jest):** 70% for all metrics (branches, statements, functions, lines).
- **Python (Pytest):** 80% line coverage.

---

### Q: How do you handle database migrations?

**A:**

- **TypeORM (NestJS):** Migration files in `src/migrations/`, run via `typeorm migration:run`.
- **Django:** Auto‑generated via `python manage.py makemigrations`, applied with `migrate`.

---

### Q: What HTTP status codes does the API return?

**A:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Insufficient role/team access |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Internal error |

---

### Q: What is the `.editorconfig` for?

**A:** Enforces consistent coding style (indent size, line endings, trailing whitespace) across all editors and IDEs without relying on editor‑specific settings.

---

### Q: Why conventional commits?

**A:** Standardised commit messages (`feat:`, `fix:`, `docs:`, `chore:`) enable:

1. Automated changelog generation.
2. Semantic version bumping.
3. Easy filtering of commit history.

---

### Q: What is the `Makefile` for?

**A:** Developer shortcuts:

| Command | Effect |
|---|---|
| `make dev` | Start full stack via Docker Compose |
| `make test` | Run all tests across all services |
| `make lint` | Lint all services |
| `make build` | Build all Docker images |
| `make smoke` | Run integration smoke tests |
| `make clean` | Stop containers and clean volumes |

---

### Q: What is a DTO?

**A:** Data Transfer Object — a class that defines the shape of request/response data. In NestJS, DTOs use `class-validator` decorators for automatic validation. Example: `LoginDto` has `@IsEmail()` on the email field and `@IsString()` on the password field.

---

### Q: What is a Guard in NestJS?

**A:** A class that implements `CanActivate` and decides whether a request should proceed. I use two: `RolesGuard` (checks user role) and `TeamAccessGuard` (checks team membership). They run before the controller method.

---

### Q: What is a Middleware vs. a Guard vs. an Interceptor?

**A:**

| Concept | When it runs | Use case |
|---|---|---|
| **Middleware** | Before routing | Proxy, logging, header injection |
| **Guard** | After routing, before handler | Auth, RBAC |
| **Interceptor** | Around handler | Response transformation, caching, timing |

---

### Q: What are Angular Signals?

**A:** Reactive primitives introduced in Angular 16+. A `signal()` holds a value; a `computed()` derives from it; an `effect()` runs side effects when signals change. They replace RxJS `BehaviorSubject` for most use cases with simpler, synchronous syntax.

---

### Q: What is zoneless change detection?

**A:** Angular traditionally uses Zone.js to detect async operations and trigger UI updates. Zoneless mode (Angular 19) uses signals to know exactly which components need re‑rendering, removing the Zone.js overhead and improving performance.

---

### Q: What would you add next?

**A:**

1. **Dependency health monitoring** — ping registered services and show live status on the graph.
2. **Slack/Teams notifications** — alert when a change proposal has a high risk score.
3. **Automated canary analysis** — integrate with deployment pipelines to block risky rollouts.
4. **Multi‑tenant support** — namespace isolation for different teams/orgs.
5. **Playwright E2E tests** — browser‑level tests for the full user journey.

---

### Q: What are the trade‑offs of your approach?

**A:**

| Choice | Trade‑off |
|---|---|
| In‑memory graph | ⚡ Fast queries, but limited by single‑server RAM |
| Polyglot (TS + Python) | 🔧 Best tool per job, but wider skill requirement |
| Monorepo | 🔄 Atomic changes, but CI runs are longer |
| Separate databases | 🗄️ Optimised per workload, but operational overhead |
| WebSocket for real‑time | ⚡ Instant updates, but stateful connections to manage |

---

### Q: If you had unlimited time, what would you refactor?

**A:**

1. Extract graph algorithms into a separate library (`libs/graph-algorithms`) for reuse.
2. Add gRPC between internal services for type‑safe, faster communication.
3. Implement event sourcing for the topology service so every graph change is an immutable event.
4. Add a GraphQL API layer for flexible frontend queries.

---

> **Final tip:** For any question you don't know the answer to, say: *"That's a great question — let me walk you through how I'd approach figuring it out"* and describe your debugging/research process. Never bluff.

---

## 10. Angular Deep Dive

### Q: How does the Angular app handle authentication?

**A:** Three pieces work together:

1. **`AuthService`** — holds all auth state in a single `signal<AuthState>` (access token, refresh token, user). Exposes `computed()` getters: `isAuthenticated`, `isAdmin`, `accessToken`, `user`.
2. **`authTokenInterceptor`** (functional HTTP interceptor) — injects `AuthService`, reads the access token, and clones every outgoing request with `Authorization: Bearer <token>`.
3. **`refreshTokenInterceptor`** — catches 401 responses, calls `auth.refreshToken()`, then retries the original request with the new token. Skips retry if the failing request was itself a `/auth/refresh` call (avoids infinite loops).

---

### Q: How does the refresh interceptor avoid race conditions?

**A:** `AuthService.refreshToken()` stores the in‑flight promise in `this.refreshPromise`. If a second 401 arrives while a refresh is already in progress, it returns the *same* promise instead of making a duplicate HTTP call. The promise is cleared in `.finally()`.

---

### Q: What Angular route guards exist?

**A:** Two functional guards (`CanActivateFn`):

| Guard | File | Logic |
|---|---|---|
| `authGuard` | `core/guards/auth.guard.ts` | If `auth.isAuthenticated()` → allow; else redirect to `/login` |
| `adminGuard` | `core/guards/admin.guard.ts` | If `auth.isAdmin()` → allow; else redirect to `/dashboard` |

`adminGuard` protects the `teams/:id` detail page (only admins manage teams).

---

### Q: What does the routing structure look like?

**A:** Two layout branches:

```
/login                → AuthLayoutComponent (no sidebar)
  /login              → LoginPage
  /login/google-callback → GoogleCallbackPage

/                     → MainLayoutComponent (sidebar + topbar) [authGuard]
  /dashboard          → DashboardPage         (preloaded)
  /graph              → GraphPage             (preloaded)
  /analysis           → AnalysisPage
  /registry           → RegistryPage
  /registry/:id       → RegistryDetailPage
  /teams              → TeamsPage
  /teams/:id          → TeamDetailPage        [adminGuard]
  /snapshots          → SnapshotsPage
  /                   → redirects to /dashboard
  /**                 → redirects to /dashboard
```

Every page is **lazy‑loaded** via `loadComponent: () => import(...)`. Dashboard and Graph are marked `preload: true` for faster navigation.

---

### Q: What custom Angular pipes exist?

**A:**

| Pipe | File | What it does |
|---|---|---|
| `TruncatePipe` | `shared/pipes/truncate.pipe.ts` | Truncates a string to 60 chars (configurable) and appends `...` |
| `RelativeTimePipe` | `shared/pipes/relative-time.pipe.ts` | Converts a Date to "5m ago", "2h ago", "3d ago" |

Both are standalone pipes used in templates for service descriptions and timestamps.

---

### Q: How does the WebSocket service work on the frontend?

**A:** `WebSocketService` (singleton, `providedIn: 'root'`):

1. `connect()` — creates a Socket.io client pointing at the topology service, using WebSocket transport only.
2. Listens for `graph_update` events and sets a `signal<GraphUpdateEvent>`.
3. Any component can read `webSocketService.graphUpdate()` — it is reactive.
4. `disconnect()` — cleans up the socket.

The `GraphPage` calls `connect()` on init and `disconnect()` on destroy.

---

### Q: Why standalone components?

**A:** Angular 19 standalone components do not need `NgModule` declarations. Each component declares its own imports. Benefits:

- **Tree‑shakable** — unused components are not bundled.
- **Simpler architecture** — no module dependency graph to manage.
- **Faster compilation** — smaller compilation units.

---

### Q: What is `@defer` and how is it used?

**A:** Angular's `@defer` block lazy‑loads a component only when it is needed (e.g., when visible in the viewport). In the `GraphPage`, the D3 canvas component is wrapped in `@defer` so the heavy D3 library is not loaded until the user navigates to that page. This reduces the initial bundle size.

---

### Q: How does the Angular app decode JWTs?

**A:** `AuthService.decodeJwtPayload()`:

1. Splits the token string on `.` and takes the second part (payload).
2. Replaces URL‑safe Base64 characters (`-` → `+`, `_` → `/`).
3. Pads to a multiple of 4 and runs `atob()` to decode.
4. Parses the JSON to extract `sub`, `email`, `roles`.

**No external JWT library needed** — the payload is not verified on the client (the server already verified it).

---

## 11. Docker & Containerisation

### Q: What Docker strategy do you use?

**A:** **Multi‑stage builds** for every service to minimise image size:

| Service | Stage 1 (Build) | Stage 2 (Runtime) |
|---|---|---|
| Web App | `node:20` → `npm run build` | `nginx:alpine` → serves static files |
| Auth Gateway | `node:20` → `npm run build` | `node:20-slim` → runs `dist/main.js` |
| Topology Service | `node:20` → `npm run build` | `node:20-slim` → runs `dist/main.js` |
| Analysis Service | `python:3.12` → `uv sync` | Same image → `uvicorn` |
| Registry Service | `python:3.12` → `uv sync` | Same image → `gunicorn` |

---

### Q: Why Nginx for the web app?

**A:** The Angular build produces static HTML/JS/CSS. Nginx serves them at near‑zero CPU cost with:

- **Gzip compression** for smaller payloads.
- **Cache headers** for fingerprinted assets.
- **SPA fallback** — all routes return `index.html` so Angular Router handles them.
- The `CMD` is `nginx -g "daemon off;"` to run in the foreground (Docker requirement).

---

### Q: Why Gunicorn for Django?

**A:** Django's built‑in `runserver` is single‑threaded and not production‑ready. **Gunicorn** is a pre‑fork WSGI server that spawns multiple worker processes, handling concurrent requests. The registry service Dockerfile runs: `gunicorn registry.wsgi:application --bind 0.0.0.0:8001`.

---

### Q: What does the Docker Compose file define?

**A:** `infra/docker/docker-compose.yml` spins up the entire stack:

| Container | Image / Build | Port | Depends on |
|---|---|---|---|
| `postgres` | `postgres:16` | 5432 | — |
| `mongo` | `mongo:7` | 27017 | — |
| `redis` | `redis:7-alpine` | 6379 | — |
| `nats` | `nats:2.10` | 4222, 8222 | — |
| `topology-service` | Build from `apps/topology-service` | 3001 | mongo, redis, nats |
| `analysis-service` | Build from `apps/analysis-service` | 8000 | redis, topology |
| `registry-service` | Build from `apps/registry-service` | 8001 | postgres |
| `auth-gateway` | Build from `apps/auth-gateway` | 3000 | postgres, redis, topology, analysis, registry |
| `web-app` | Build from `apps/web-app` | 4200 | auth-gateway |

Every service has a **health check** so dependents only start after their dependencies are healthy.

---

### Q: What is the registry service's Docker entrypoint?

**A:** It runs a multi‑step startup:

1. `python manage.py migrate` — applies database migrations.
2. `python manage.py shell -c "..."` — seeds default data if needed.
3. `gunicorn registry.wsgi:application` — starts the WSGI server.

This ensures the database is always up‑to‑date before serving traffic.

---

## 12. Error Handling & Resilience

### Q: How do NestJS services handle errors?

**A:** Two layers:

1. **`AllExceptionsFilter`** (global exception filter in the topology service):
   - Catches all unhandled exceptions.
   - If it is a NestJS `HttpException`, extracts the status and message.
   - If it is a generic `Error`, returns 500 with the error message.
   - Returns a structured JSON response: `{ statusCode, message, timestamp, path }`.

2. **NestJS built‑in exceptions** — controllers throw `NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`, etc. These are caught by the filter.

---

### Q: What is the CorrelationIdInterceptor?

**A:** `CorrelationIdInterceptor` in the topology service:

1. Checks incoming request for an `X-Correlation-Id` header.
2. If missing, generates a new UUID.
3. Attaches it to both the request and the response headers.
4. Every log line and downstream call carries this ID.

**Purpose:** Links all log entries across services for a single user request — essential for debugging distributed issues.

---

### Q: How does the analysis service handle HTTP failures?

**A:** The analysis service's HTTP client includes **circuit breaker** logic:

- Tracks consecutive failures to the topology service.
- After a threshold of failures, the circuit "opens" and immediately returns an error without making the call (fail fast).
- After a cooldown period, it allows one test request ("half‑open").
- If the test succeeds, the circuit closes and normal traffic resumes.

**Why?** If the topology service is down, hammering it with retries wastes resources and slows recovery.

---

### Q: How does the analysis service handle custom errors?

**A:** A custom `AnalysisServiceError` class wraps domain errors with:

- A machine‑readable error code.
- A human‑readable message.
- An HTTP status code.

FastAPI's exception handler converts these into structured JSON responses matching the OpenAPI error schema.

---

### Q: How does the frontend handle errors?

**A:** The `refreshTokenInterceptor`:

- Catches 401 errors and attempts a token refresh.
- If the refresh fails (e.g., refresh token expired), calls `auth.logout()` which clears state and redirects to `/login`.
- Other HTTP errors propagate to the calling component, which displays them via PrimeNG toast messages.

---

## 13. Observability Deep Dive

### Q: What specific Prometheus metrics are tracked?

**A:**

**Topology Service:**

| Metric | Type | Description |
|---|---|---|
| `graph_node_count` | Gauge | Current number of nodes in the graph |
| `graph_edge_count` | Gauge | Current number of edges in the graph |
| `analysis_duration_seconds` | Histogram | Time taken for graph operations |
| `change_proposals_total` | Counter | Number of change proposals processed |

**Auth Gateway:**

| Metric | Type | Labels | Description |
|---|---|---|---|
| `analysis_duration_seconds` | Histogram | `route`, `status_code` | Proxied request latency |
| `change_proposals_total` | Counter | `route` | Proxied requests related to analysis |

---

### Q: How does the ProxyMetricsMiddleware work?

**A:** In the auth gateway:

1. Records `process.hrtime()` at request start.
2. Checks if the route matches an analysis or impact endpoint.
3. On response finish, calculates elapsed time in seconds (nanosecond precision).
4. Records the duration in the `analysis_duration_seconds` histogram with route and status labels.
5. If the request was a change proposal, increments the `change_proposals_total` counter.

---

### Q: What health checks exist?

**A:** Every service has health endpoints:

| Service | Endpoint | What it checks |
|---|---|---|
| **Topology** | `/health`, `/health/live`, `/health/ready` | MongoDB connection, Redis connection, memory usage |
| **Auth Gateway** | `/health`, `/health/live`, `/health/ready` | PostgreSQL connection, Redis connection |
| **Analysis** | `/health/live` | Topology service reachability, Redis connection |
| **Registry** | `/health/live`, `/health/ready` | PostgreSQL connection, migrations status |

**Liveness** = "is the process alive?" (restart if not).  
**Readiness** = "can it serve traffic?" (remove from load balancer if not).

---

### Q: How does distributed tracing work?

**A:**

1. The **proxy middleware** generates or propagates `X-Request-Id`.
2. The **CorrelationIdInterceptor** in downstream services picks it up or generates a new one.
3. **Pino logger** (NestJS) includes the correlation ID in every log line.
4. **OpenTelemetry** exports traces to the configured OTLP endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`).
5. Result: you can search for a single request ID and see the full trace across all services.

---

## 14. Data Model & Database Deep Dive

### Q: What are the Auth Gateway's database entities?

**A:** PostgreSQL via TypeORM:

**User entity:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto‑generated |
| `email` | varchar | Unique, indexed |
| `displayName` | varchar | — |
| `passwordHash` | varchar | Nullable (OAuth users have no password) |
| `role` | enum | `admin`, `team_lead`, `engineer`, `viewer` |
| `teams` | jsonb | Array of `{ teamId, teamRole }` |
| `authProvider` | enum | `local` or `google` |
| `lastLoginAt` | timestamp | Updated on every login |
| `createdAt` | timestamp | Auto‑set |
| `updatedAt` | timestamp | Auto‑updated |

Migration: `1730000000000-init-users` creates this table.

---

### Q: What are the Topology Service's data models?

**A:** MongoDB documents (no strict schema, but typed in code):

**ServiceNode:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique service identifier |
| `name` | string | Human‑readable name |
| `type` | string | `api`, `worker`, `gateway` |
| `metadata` | object | Arbitrary key‑value pairs |
| `version` | string | Service version |

**DependencyEdge:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique edge identifier |
| `source` | string | Source service ID |
| `target` | string | Target service ID |
| `type` | string | `http`, `grpc`, `event` |
| `weight` | number | Dependency strength (0–1) |
| `latency` | number | Average latency in ms |
| `metadata` | object | Arbitrary key‑value pairs |

**GraphSnapshot (MongoDB):**

| Field | Type | Description |
|---|---|---|
| `version` | number | Incremental snapshot version |
| `timestamp` | date | When snapshot was taken |
| `nodes` | ServiceNode[] | All nodes |
| `edges` | DependencyEdge[] | All edges |

---

### Q: What are the Registry Service's Django models?

**A:** PostgreSQL via Django ORM:

**Service:**

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `name` | CharField | Unique |
| `service_type` | CharField | Choices: `api`, `worker`, `gateway` |
| `status` | CharField | Choices: `active`, `deprecated`, `inactive` |
| `description` | TextField | Optional |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

**ServiceVersion:**

| Field | Type | Constraint |
|---|---|---|
| `id` | UUID (PK) | Auto |
| `service` | FK → Service | Cascade delete |
| `version` | CharField | — |
| `is_current` | BooleanField | **Unique constraint**: only one current version per service |
| `created_at` | DateTimeField | Auto |

**Team:**

| Field | Type |
|---|---|
| `id` | UUID (PK) |
| `name` | CharField (unique) |
| `description` | TextField |
| `created_at` | DateTimeField |

**TeamMembership:**

| Field | Type | Constraint |
|---|---|---|
| `team` | FK → Team | Cascade |
| `user_email` | CharField | — |
| `role` | CharField | Choices: `owner`, `maintainer`, `viewer` |
| **Unique together** | `(team, user_email)` | — |

**ServiceOwnership:**

| Field | Type | Constraint |
|---|---|---|
| `service` | FK → Service | Cascade |
| `team` | FK → Team | Cascade |
| `ownership_type` | CharField | `primary`, `shared` |
| **Unique together** | `(service, team)` | — |

**DependencySnapshot:**

| Field | Type |
|---|---|
| `id` | UUID (PK) |
| `captured_at` | DateTimeField |
| `node_count` | IntegerField |
| `edge_count` | IntegerField |
| `graph_data` | JSONField |
| `notes` | TextField (optional) |

---

### Q: What is the unique current version constraint?

**A:** The `ServiceVersion` model has a constraint ensuring only one version per service can have `is_current=True`. This prevents conflicting "latest" versions and is enforced at the database level (partial unique index).

---

### Q: What is the `capture_snapshot` management command?

**A:** A Django management command (`python manage.py capture_snapshot`):

1. Fetches the current graph from the Topology Service's export endpoint.
2. Counts nodes and edges.
3. Saves the full graph data as a `DependencySnapshot` with an optional `--notes` argument.

**Use case:** Scheduled snapshots (cron) or manual captures before major deployments for diff comparison.

---

## 15. API Endpoint Reference

### Auth Gateway (`/api/auth/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | None | Email + password login |
| `POST` | `/auth/refresh` | None | Refresh token rotation |
| `POST` | `/auth/logout` | Bearer | Invalidate refresh token |
| `GET` | `/auth/google` | None | Start Google OAuth flow |
| `GET` | `/auth/google/callback` | None | Google OAuth callback |
| `GET` | `/users` | Admin | List all users |
| `GET` | `/users/:id` | Admin | Get user by ID |
| `PATCH` | `/users/:id` | Admin | Update user role/teams |

### Topology Service (`/api/v1/`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/ingestion/services` | Register a service node |
| `PUT` | `/ingestion/services/:id` | Update a service node |
| `DELETE` | `/ingestion/services/:id` | Remove a service node |
| `POST` | `/ingestion/dependencies` | Register a dependency edge |
| `DELETE` | `/ingestion/dependencies/:id` | Remove a dependency edge |
| `POST` | `/ingestion/bulk` | Bulk register nodes + edges |
| `GET` | `/query/services` | List all services |
| `GET` | `/query/services/:id` | Get service details |
| `GET` | `/query/services/:id/dependencies` | Direct dependencies |
| `GET` | `/query/services/:id/dependents` | Reverse dependencies |
| `GET` | `/query/services/:id/transitive` | Transitive dependencies (with `?depth=`) |
| `GET` | `/query/blast-radius/:id` | Blast radius calculation |
| `GET` | `/query/paths/:source/:target` | Shortest path between services |
| `GET` | `/query/cycles` | All cycles in the graph |
| `GET` | `/query/topological-sort` | Topological ordering |
| `GET` | `/query/statistics` | Graph density, node/edge counts |
| `GET` | `/query/export` | Full graph export (nodes + edges) |

### Analysis Service (`/`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/analysis/impact` | Synchronous impact analysis |
| `POST` | `/analysis/impact/async` | Queue async analysis job |
| `GET` | `/analysis/impact/results/:id` | Fetch async result by ID |
| `POST` | `/compatibility/check` | Schema compatibility check |
| `POST` | `/simulation/cascade` | Cascading failure simulation |

### Registry Service (`/api/`)

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/services/` | List / Create services |
| `GET/PUT/PATCH/DELETE` | `/services/:id/` | Service CRUD |
| `GET/POST` | `/services/:id/versions/` | List / Add versions |
| `GET/POST` | `/services/:id/endpoints/` | List / Add endpoints |
| `GET/POST` | `/teams/` | List / Create teams |
| `GET/PUT/PATCH/DELETE` | `/teams/:id/` | Team CRUD |
| `GET/POST` | `/teams/:id/members/` | List / Add members |
| `GET/POST` | `/teams/:id/services/` | List / Assign service ownership |
| `GET/POST` | `/snapshots/` | List / Create snapshots |
| `GET` | `/snapshots/:id/` | Snapshot detail |
| `GET` | `/snapshots/compare/` | Compare two snapshots |

### WebSocket Events (Topology Service)

| Event | Direction | Description |
|---|---|---|
| `connected` | Server → Client | Connection confirmation |
| `subscribe` | Client → Server | Subscribe to graph updates |
| `unsubscribe` | Client → Server | Unsubscribe from updates |
| `ping` | Client → Server | Keepalive |
| `graph_update` | Server → Client | Graph change broadcast |

---

## 16. Environment Variables Reference

### Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `ripplemark` | PostgreSQL database name |
| `POSTGRES_USER` | `ripplemark` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `ripplemark_dev` | PostgreSQL password |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `MONGO_INITDB_DATABASE` | `ripplemark` | MongoDB database name |
| `MONGO_PORT` | `27017` | MongoDB port |
| `REDIS_PORT` | `6379` | Redis port |
| `NATS_PORT` | `4222` | NATS messaging port |

### Service Ports

| Variable | Default | Description |
|---|---|---|
| `TOPOLOGY_PORT` | `3001` | Topology service port |
| `ANALYSIS_PORT` | `8000` | Analysis service port |
| `REGISTRY_PORT` | `8001` | Registry service port |
| `AUTH_GATEWAY_PORT` | `3000` | Auth gateway port |
| `WEB_APP_PORT` | `4200` | Web app dev server port |

### Auth & Security

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_ACCESS_TTL` | Access token expiry (e.g., `15m`) |
| `JWT_REFRESH_TTL` | Refresh token expiry (e.g., `7d`) |
| `SECRET_KEY` | Django secret key |
| `CORS_ORIGINS` | Comma‑separated allowed origins |
| `THROTTLE_TTL` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | Max requests per window |

### OAuth

| Variable | Description |
|---|---|
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OAUTH_GOOGLE_CALLBACK_URL` | OAuth redirect URI |

### Service URLs

| Variable | Description |
|---|---|
| `TOPOLOGY_SERVICE_URL` | URL for the topology service |
| `ANALYSIS_SERVICE_URL` | URL for the analysis service |
| `REGISTRY_SERVICE_URL` | URL for the registry service |
| `AUTH_GATEWAY_URL` | URL for the auth gateway |
| `WEB_APP_URL` | URL for the web app |

### Inter‑Service Auth

| Variable | Description |
|---|---|
| `REGISTRY_PROXY_USERNAME` | Username for auth gateway → registry calls |
| `REGISTRY_PROXY_TOKEN` | Token for auth gateway → registry calls |
| `REQUIRE_GATEWAY_AUTH` | If `true`, registry rejects direct calls without proxy token |

### Development Helpers

| Variable | Description |
|---|---|
| `LOCAL_SEED_DEFAULT_USER` | If `true`, seeds a default admin user on startup |
| `LOCAL_DEFAULT_USER_EMAIL` | Default user email |
| `LOCAL_DEFAULT_USER_PASSWORD` | Default user password |
| `LOCAL_DEFAULT_USER_DISPLAY_NAME` | Default user display name |
| `NODE_ENV` | `development`, `test`, or `production` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) |

### Observability

| Variable | Description |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector URL |
| `GRAPH_CACHE_TTL` | Graph cache duration in seconds |
| `MAX_DEPTH` | Max traversal depth for transitive queries |

---

## 17. Gotcha & Trick Questions

### Q: Is NATS actually used in the codebase?

**A:** NATS is in the architecture diagram and Docker Compose, but the **publish/subscribe wiring is not yet implemented in application code**. It is provisioned and ready for the next phase — adding event‑driven notifications (e.g., "service registered" events). Currently, real‑time updates use WebSocket only. *Be honest about this — it shows you know the difference between planned architecture and current implementation.*

---

### Q: If the topology service is down, can the analysis service still work?

**A:** No. The analysis service **fetches the graph from the topology service** on every analysis request. If topology is down, the circuit breaker will trip and analysis returns an error immediately rather than hanging. The mitigation is to add graph caching in Redis so analysis can work on a stale graph.

---

### Q: How is the default user seeded?

**A:** When `LOCAL_SEED_DEFAULT_USER=true`, the auth gateway checks on startup if the user exists. If not, it creates an admin user with the configured email/password. This is **only for local development** — the env var is not set in production.

---

### Q: Why does the registry service have a proxy token?

**A:** The auth gateway proxies requests to the registry and injects `REGISTRY_PROXY_TOKEN` in the headers. When `REQUIRE_GATEWAY_AUTH=true`, the registry validates this token and rejects any direct calls. This prevents users from bypassing the auth gateway and hitting the registry directly.

---

### Q: What happens if two topology service instances run simultaneously?

**A:** The graph is **in‑memory per instance**. Two instances would have divergent graphs. This is a known limitation — the current design assumes a single topology service instance. For HA, you would need either:

- A shared Redis graph (trade‑off: slower lookups).
- Leader election with graph replication.
- An event‑sourced log so instances can replay to a consistent state.

---

### Q: Is there any data you could lose?

**A:** Yes — graph changes between periodic MongoDB snapshots. If the topology service crashes 30 seconds after the last snapshot and the snapshot interval is 60 seconds, those 30 seconds of changes are lost. Mitigation: reduce the snapshot interval or move to event sourcing.

---

### Q: Why is there no GraphQL?

**A:** REST was chosen for simplicity and because the API surface is well‑defined (not deeply nested queries). GraphQL would add value if the frontend needed flexible sub‑selections of graph data. It is on the future roadmap.

---

### Q: Why no gRPC between internal services?

**A:** gRPC would provide type‑safe, faster inter‑service communication (binary protocol, code‑generated clients). REST was chosen for rapid iteration and easier debugging (cURL, Swagger). gRPC is on the refactoring wishlist.

---

### Q: What if someone asks "Show me a bug"?

**A:** Acknowledge one honestly: *"The topology service's in‑memory graph does not sync across replicas, so horizontal scaling requires architectural changes. I documented this as a known limitation."* Showing you know your weak spots builds trust.

---

### Q: Can you explain every ADR?

**A:** Yes — there are eight:

| ADR | Decision | Key Trade‑off |
|---|---|---|
| 001 | Monorepo | Atomic changes vs. longer CI |
| 002 | NestJS for graph services | Enterprise patterns vs. learning curve |
| 003 | FastAPI for analysis | Python ecosystem vs. polyglot ops |
| 004 | Django for registry | Mature ORM vs. another Python framework |
| 005 | MongoDB for graph storage | Flexible schema vs. no ACID joins |
| 006 | NATS over Kafka | Low latency vs. no durable replay |
| 007 | Signals over NgRx | Less boilerplate vs. less ecosystem tooling |
| 008 | GitOps with ArgoCD | Declarative deploys vs. ArgoCD ops overhead |

---

## 18. Behavioural & Soft‑Skill Questions

### Q: Tell me about a time you failed.

**A:** *"I initially built the topology service with direct MongoDB queries for every graph traversal. Response times were 200–500 ms. I realised the bottleneck was network round‑trips per BFS hop. I refactored to an in‑memory graph with periodic snapshots — response times dropped to under 5 ms. The lesson: measure before optimising, and don't be afraid to change a core design decision when data proves it wrong."*

---

### Q: How do you prioritise work?

**A:** *"I use three criteria: (1) Does it unblock other work? (2) Does it reduce risk? (3) Does it deliver user value? For Ripplemark, I built auth first (unblocks all services), then the graph engine (core value), then the UI (user‑facing). Docs and tests were continuous, not afterthoughts."*

---

### Q: How would you onboard a new developer?

**A:** *"I wrote `docs/onboarding.md` with exact steps: prerequisites, clone, `make dev`, verify health checks, run tests. Then I'd pair with them on a small task — like adding a field to a service node — that touches the full stack: DTO, GraphService, API contract, test, Angular display. In one task they see every layer."*

---

### Q: How do you handle a production incident?

**A:** *"First: mitigate (rollback, feature flag, or scale). Then: investigate using the correlation ID — one ID traces the request through all services via structured Pino logs. Once I find the root cause, I fix it, add a test that reproduces it, and write a postmortem. Ripplemark's observability stack was designed for exactly this workflow."*

---

### Q: Why should we hire you?

**A:** *"I built a production‑grade distributed system end‑to‑end — backend, frontend, infra, CI/CD, observability, and documentation. I made deliberate technology choices and documented why. I write tests at every level. And I know the limits of my design — I can tell you what needs to change for 10× scale. That means I can do the same for your codebase."*

---

### Q: What is your biggest weakness?

**A:** *"I over‑engineer early. For Ripplemark, I initially set up NATS messaging before I needed it. I learned to start with the simplest working solution and evolve — YAGNI. The NATS infra is ready but unused, which is a reminder of that lesson."*

---

### Q: Describe a technical disagreement you resolved.

**A:** *"I considered using a graph database (Neo4j) instead of MongoDB + in‑memory graph. I wrote ADR‑005 documenting both options. Neo4j has powerful traversal queries, but adds operational complexity and a new query language (Cypher). MongoDB + in‑memory graph is simpler and fast enough for our scale. I chose simplicity and documented when to revisit."*

---

### Q: How do you stay current with technology?

**A:** *"I follow Angular and NestJS release notes, read the FastAPI changelog, and watch Python packaging evolve (pip → Poetry → uv). For Ripplemark, I adopted Angular 19 Signals, zoneless change detection, and the `uv` package manager — all released in the past year. I also write ADRs so future‑me understands why I chose what I chose."*

---

### Q: How do you ensure code quality?

**A:** *"Five layers: (1) TypeScript strict mode and Pyright for type safety. (2) ESLint + Ruff for style. (3) Prettier for formatting. (4) Jest + Pytest with coverage thresholds. (5) Code review via PR — CONTRIBUTING.md defines the expectations. Quality is automated, not manual."*

---

## 19. File‑by‑File Walkthrough

> If asked "what does this file do?" for any file in the repo, use this reference.

### Root

| File | Purpose |
|---|---|
| `README.md` | Project overview, architecture diagram, quick start, tech stack |
| `CONTRIBUTING.md` | Branch naming (`feat/`, `fix/`), conventional commits, PR checklist |
| `LICENSE` | MIT License — open source, permissive |
| `Makefile` | `dev`, `test`, `lint`, `build`, `smoke`, `clean` targets |
| `.editorconfig` | Consistent indent/whitespace across editors |
| `.gitattributes` | Line ending normalisation for cross‑platform |
| `.gitignore` | Excludes `node_modules`, `dist`, `.env`, `__pycache__`, etc. |
| `.env.example` | Template for all environment variables |
| `pyrightconfig.json` | Python type checker config (strict mode) |

### `apps/auth-gateway/`

| File | Purpose |
|---|---|
| `src/main.ts` | Bootstraps NestJS, global validation pipe, CORS, Swagger, Helmet |
| `src/app.module.ts` | Root module: TypeORM, Throttle, Auth, Users, Proxy, Health, Metrics |
| `src/app.config.ts` | Joi‑validated environment variable schema |
| `src/auth/auth.module.ts` | Passport strategies, JWT, Redis token service |
| `src/auth/auth.service.ts` | Validates credentials, issues JWTs, manages refresh tokens |
| `src/auth/auth.controller.ts` | `/login`, `/refresh`, `/logout`, `/google`, `/google/callback` |
| `src/auth/strategies/local.strategy.ts` | Passport `local` strategy (email + password) |
| `src/auth/strategies/jwt.strategy.ts` | Passport `jwt` strategy (extracts from Bearer header) |
| `src/auth/strategies/google.strategy.ts` | Passport `google` OAuth2 strategy |
| `src/auth/guards/local-auth.guard.ts` | Triggers Passport local authentication |
| `src/auth/guards/jwt-auth.guard.ts` | Triggers Passport JWT validation |
| `src/auth/redis-token.service.ts` | Stores/validates/deletes refresh token JTIs in Redis |
| `src/authorization/roles.guard.ts` | Checks user role ≥ required role |
| `src/authorization/team-access.guard.ts` | Checks team membership + team role |
| `src/authorization/decorators.ts` | `@Roles()` and `@TeamAccess()` custom decorators |
| `src/users/users.module.ts` | TypeORM User entity registration |
| `src/users/users.service.ts` | CRUD for users, bcrypt hashing, login tracking |
| `src/users/users.controller.ts` | `/users` endpoints (admin only) |
| `src/users/user.entity.ts` | TypeORM entity: User with roles, teams, auth provider |
| `src/users/dto/` | Login DTO, Create User DTO with validation decorators |
| `src/proxy/proxy.module.ts` | Registers proxy middleware for downstream routes |
| `src/proxy/proxy.middleware.ts` | JWT verify → route matching → header enrichment → proxy |
| `src/observability/proxy-metrics.middleware.ts` | Prometheus latency + counter tracking |
| `src/observability/metrics.service.ts` | Prometheus histogram + counter instances |
| `src/observability/metrics.controller.ts` | `GET /metrics` endpoint for Prometheus scraping |
| `src/health/health.controller.ts` | Liveness + readiness checks (PG + Redis) |
| `src/migrations/1730000000000-init-users.ts` | Creates users table |
| `src/typeorm.datasource.ts` | TypeORM CLI datasource config for migrations |

### `apps/topology-service/`

| File | Purpose |
|---|---|
| `src/main.ts` | Bootstraps NestJS, global pipes, CORS, Swagger |
| `src/app.module.ts` | Root module: Mongoose, Pino, Graph, Ingestion, Query, Health, Metrics |
| `src/app.config.ts` | Joi‑validated env var schema (Mongo, Redis, ports) |
| `src/graph/graph.module.ts` | Provides GraphService as singleton |
| `src/graph/graph.service.ts` | **Core**: in‑memory graph, Tarjan, Kahn, BFS, blast radius |
| `src/graph/models/service-node.model.ts` | ServiceNode interface + Mongoose schema |
| `src/graph/models/dependency-edge.model.ts` | DependencyEdge interface + Mongoose schema |
| `src/ingestion/ingestion.module.ts` | Ingestion controller + gateway |
| `src/ingestion/ingestion.controller.ts` | `POST /ingestion/services`, `/dependencies`, `/bulk` |
| `src/ingestion/dto/` | RegisterServiceDto, RegisterDependencyDto, BulkRegisterDto |
| `src/ingestion/graph.gateway.ts` | WebSocket gateway: subscribe, unsubscribe, ping, graph_update |
| `src/query/query.module.ts` | Query controller |
| `src/query/query.controller.ts` | `GET /query/services`, `/blast-radius`, `/cycles`, `/paths`, etc. |
| `src/persistence/persistence.module.ts` | MongoDB snapshot persistence |
| `src/persistence/persistence.service.ts` | Load, save, restore, cleanup snapshots |
| `src/persistence/schemas/graph-snapshot.schema.ts` | Mongoose schema for snapshots |
| `src/common/filters/all-exceptions.filter.ts` | Global exception handler → structured JSON |
| `src/common/interceptors/correlation-id.interceptor.ts` | UUID correlation ID on every request/response |
| `src/observability/metrics.service.ts` | Prometheus gauges + histograms for graph metrics |
| `src/observability/metrics.controller.ts` | `GET /metrics` for Prometheus |
| `src/health/health.controller.ts` | Mongo + Redis + memory health checks |

### `apps/analysis-service/`

| File | Purpose |
|---|---|
| `src/analysis_service/main.py` | FastAPI app creation, CORS, routers, exception handlers |
| `src/analysis_service/config.py` | Pydantic `BaseSettings` for env vars |
| `src/analysis_service/analysis/router.py` | `/analysis/impact`, `/analysis/impact/async`, `/analysis/impact/results/:id` |
| `src/analysis_service/analysis/engine.py` | `ImpactAnalysisEngine`: BFS traversal, risk scoring |
| `src/analysis_service/analysis/models.py` | Pydantic models: ChangeProposal, ImpactResult, AffectedService |
| `src/analysis_service/compatibility/router.py` | `/compatibility/check` |
| `src/analysis_service/compatibility/checker.py` | Schema diff: breaking vs. safe changes |
| `src/analysis_service/compatibility/models.py` | CompatibilityRequest/Response models |
| `src/analysis_service/simulation/router.py` | `/simulation/cascade` |
| `src/analysis_service/simulation/engine.py` | NetworkX cascading failure simulation |
| `src/analysis_service/simulation/models.py` | SimulationRequest/Response models |
| `src/analysis_service/http_client.py` | HTTP client with circuit breaker for topology calls |
| `src/analysis_service/health/router.py` | `/health/live` endpoint |
| `src/analysis_service/errors.py` | `AnalysisServiceError` custom exception class |

### `apps/registry-service/`

| File | Purpose |
|---|---|
| `manage.py` | Django CLI entry point |
| `registry/settings/base.py` | Core settings: DB, apps, REST framework, logging |
| `registry/settings/development.py` | Debug mode, relaxed CORS |
| `registry/settings/test.py` | SQLite for fast tests |
| `registry/urls.py` | URL routing: `/api/` prefix for all apps |
| `registry/wsgi.py` | WSGI entry point for Gunicorn |
| `registry/apps/services/models.py` | Service, ServiceVersion, ServiceEndpoint models |
| `registry/apps/services/serializers.py` | DRF serializers for services |
| `registry/apps/services/views.py` | `ServiceViewSet` with version + endpoint sub‑routes |
| `registry/apps/services/urls.py` | Router registration |
| `registry/apps/teams/models.py` | Team, TeamMembership, ServiceOwnership models |
| `registry/apps/teams/serializers.py` | DRF serializers for teams |
| `registry/apps/teams/views.py` | `TeamViewSet` with member + ownership sub‑routes |
| `registry/apps/teams/urls.py` | Router registration |
| `registry/apps/snapshots/models.py` | DependencySnapshot model |
| `registry/apps/snapshots/serializers.py` | Snapshot serializer with comparison |
| `registry/apps/snapshots/views.py` | `SnapshotViewSet` with compare action |
| `registry/apps/snapshots/urls.py` | Router registration |
| `registry/apps/snapshots/management/commands/capture_snapshot.py` | CLI command to capture graph snapshot |
| `registry/apps/health/views.py` | Liveness + readiness health checks |

### `apps/web-app/`

| File | Purpose |
|---|---|
| `src/main.ts` | Angular bootstrap with `provideZoneChangeDetection` |
| `src/app/app.component.ts` | Root component with `<router-outlet>` |
| `src/app/app.routes.ts` | All routes with lazy loading + guards |
| `src/app/app.config.ts` | Angular providers: HTTP client, router, interceptors |
| `src/app/core/services/auth.service.ts` | Signal‑based auth state, JWT decode, refresh logic |
| `src/app/core/services/api.service.ts` | Typed HTTP client wrapper |
| `src/app/core/services/websocket.service.ts` | Socket.io client with signal‑based updates |
| `src/app/core/interceptors/auth-token.interceptor.ts` | Attaches Bearer token to requests |
| `src/app/core/interceptors/refresh-token.interceptor.ts` | Auto‑refreshes on 401 |
| `src/app/core/guards/auth.guard.ts` | Redirects to `/login` if not authenticated |
| `src/app/core/guards/admin.guard.ts` | Redirects to `/dashboard` if not admin |
| `src/app/features/auth/login.page.ts` | Login form with email/password + Google OAuth |
| `src/app/features/auth/google-callback.page.ts` | Handles OAuth redirect |
| `src/app/features/dashboard/dashboard.page.ts` | Overview cards: service count, dependencies, health |
| `src/app/features/graph/graph.page.ts` | D3 graph + WebSocket + search |
| `src/app/features/graph/graph-canvas.component.ts` | D3 force simulation rendering |
| `src/app/features/analysis/analysis.page.ts` | Change proposal form + risk results |
| `src/app/features/registry/registry.page.ts` | Service catalogue list |
| `src/app/features/registry/registry-detail.page.ts` | Single service detail view |
| `src/app/features/teams/teams.page.ts` | Team list |
| `src/app/features/teams/team-detail.page.ts` | Team members + owned services |
| `src/app/features/snapshots/snapshots.page.ts` | Snapshot list + diff comparison |
| `src/app/shared/pipes/truncate.pipe.ts` | String truncation pipe |
| `src/app/shared/pipes/relative-time.pipe.ts` | Relative time display pipe |
| `src/app/layouts/main-layout.component.ts` | Sidebar + topbar shell |
| `src/app/layouts/auth-layout.component.ts` | Centred card layout for login |

### `libs/`

| File | Purpose |
|---|---|
| `api-contracts/topology.yaml` | OpenAPI 3.1 spec for topology service |
| `api-contracts/analysis.yaml` | OpenAPI 3.1 spec for analysis service |
| `api-contracts/registry.yaml` | OpenAPI 3.1 spec for registry service |
| `api-contracts/auth.yaml` | OpenAPI 3.1 spec for auth gateway |
| `auth-utils/typescript/` | JWT helpers, role constants, permission matrix (shared TS code) |
| `auth-utils/python/` | JWT helpers, role constants (shared Python code) |
| `domain-models/typescript/` | Shared TypeScript interfaces (ServiceNode, DependencyEdge, etc.) |
| `domain-models/python/` | Shared Python dataclasses |

### `infra/`

| File | Purpose |
|---|---|
| `docker/docker-compose.yml` | Full local stack definition |
| `docker/.env.example` | Docker Compose env vars |
| `helm/<service>/Chart.yaml` | Helm chart metadata per service |
| `helm/<service>/values.yaml` | Default Helm values |
| `helm/<service>/templates/` | K8s manifests (Deployment, Service, Ingress, HPA, ConfigMap) |
| `k8s/namespace.yaml` | Kubernetes namespace definition |
| `k8s/secrets.yaml` | Template for K8s secrets |
| `argocd/<service>-app.yaml` | ArgoCD Application manifests |

### `tests/`

| File | Purpose |
|---|---|
| `integration/conftest.py` | Docker Compose setup, health waits, auth fixtures |
| `integration/test_cross_service.py` | Full‑stack integration: auth → register → query → analyse → snapshot |

### `.github/workflows/`

| File | Purpose |
|---|---|
| `ci.yml` | PR checks: lint, test, build (matrix: Node + Python) |
| `security.yml` | Dependency audit, SAST scanning |
| `cd.yml` | Build + push Docker images, ArgoCD sync trigger |
| `release.yml` | Version tagging + GitHub Release creation |

---

> **You now have an answer for every possible question about every file, every decision, every algorithm, every config variable, every endpoint, every model, every pattern, and every trade‑off in this repository. If they ask something not here, fall back to: "Let me walk you through my reasoning process for that."**

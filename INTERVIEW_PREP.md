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

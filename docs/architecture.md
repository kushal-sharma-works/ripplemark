# Ripplemark Architecture

## 1) System Overview

Ripplemark is a multi-service platform for understanding service dependencies and estimating change blast radius before deployment.

### ASCII Architecture Diagram

```text
                                 +-------------------+
                                 |      Web App      |
                                 |   Angular 19 UI   |
                                 +---------+---------+
                                           |
                                           | HTTPS (JWT)
                                           v
                                 +---------+---------+
                                 |    Auth Gateway   |
                                 | NestJS (Auth/RBAC)|
                                 +----+---------+----+
                                      |         |
                     REST proxy ------+         +------ REST proxy
                                      |         |
                                      v         v
                         +------------+--+   +--+----------------+
                         | Topology Svc |   |  Registry Service  |
                         | NestJS Graph |   | Django + DRF       |
                         +------+-------+   +-----+--------------+
                                |                 |
                 REST pull      |                 | authoritative
                 + cache        |                 | metadata & teams
                                v                 v
                         +------+-----------------+------+
                         |        Analysis Service       |
                         |      FastAPI impact engine    |
                         +------+-----------------+------+
                                |                 |
                        graph reads|             async jobs/events
                                |                 |
                                v                 v
+---------------+     +---------+-----+    +------+------+
| MongoDB 7     |     | Redis 7       |    | NATS 2.10   |
| Graph docs    |     | cache/queues  |    | event bus   |
+---------------+     +---------------+    +-------------+
         ^
         |
+--------+--------+
| PostgreSQL 16   |
| users/registry  |
+-----------------+
```

## 2) Service Responsibility Matrix

| Service | Primary Responsibility | Owns Data | Exposes | Depends On |
|---|---|---|---|---|
| Web App | Operator workflows, graph visualization, impact UX | Browser state | SPA routes and websocket client | Auth Gateway |
| Auth Gateway | Authentication, JWT issuance/validation, RBAC, service proxy | Users/session metadata (PostgreSQL/Redis) | `/auth/*`, `/users/*`, proxied APIs | PostgreSQL, Redis, Topology, Analysis, Registry |
| Topology Service | Dependency graph ingestion/query, graph algorithms, realtime updates | Graph structures, snapshots | `/api/v1/ingestion/*`, `/api/v1/query/*`, websocket namespace | MongoDB, Redis, NATS |
| Analysis Service | Blast-radius computation, compatibility checks, what-if simulation | Analysis runs (cache/ephemeral + Redis queue state) | `/analysis/*`, `/simulation/*`, `/compatibility/*` | Topology Service, Redis, NATS |
| Registry Service | Authoritative catalog of services, teams, ownership, snapshots | Service registry + ownership records | `/api/services/*`, `/api/teams/*`, `/api/snapshots/*` | PostgreSQL, Redis, NATS |

## 3) Data Flow Diagrams

### A) Service Registration Flow

```text
Service Owner -> Web App -> Auth Gateway (JWT)
                 |             |
                 |             +--> RBAC check (team/admin)
                 |             +--> Proxy to Registry: POST /api/services/
                 |                              |
                 |                              +--> PostgreSQL write (service + ownership)
                 |
                 +--> Optional topology seed --> Topology: POST /api/v1/ingestion/services
                                                |
                                                +--> MongoDB graph node upsert
                                                +--> NATS event: service.registered
```

### B) Dependency Discovery Flow

```text
Runtime scanner / CI metadata source
    -> Topology ingestion endpoint
    -> Topology validates nodes/edges
    -> MongoDB graph edge upsert
    -> Redis cache refresh for hot queries
    -> NATS event: dependency.updated
    -> Registry snapshot endpoint (optional) for auditable historical baseline
```

### C) Change Impact Analysis Flow

```text
Engineer -> Web App -> Auth Gateway -> Analysis: POST /analysis/impact
                                         |
                                         +--> Pull current graph from Topology
                                         +--> Pull ownership/service metadata from Registry (as needed)
                                         +--> Compute affected services + risk score
                                         +--> Cache result in Redis / queue async continuation
                                         +--> Return impact result to UI
```

## 4) Technology Selection Rationale

### Why NestJS for Topology Service
- Strong TypeScript model supports rich domain DTOs for graph operations.
- Built-in WebSocket, interceptors, pipes, and DI simplify real-time graph management.
- Mature ecosystem for OpenAPI, structured logging, and operational health checks.

### Why FastAPI for Analysis Service
- High developer velocity for algorithmic/data-heavy Python workflows.
- Native async support and excellent request/response validation via Pydantic.
- Easy integration with scientific/network analysis libraries and quick iteration cycles.

### Why Django for Registry Service
- Strong relational modeling and admin workflows fit authoritative metadata ownership.
- DRF provides robust CRUD, pagination, and filtering for registry datasets.
- Mature auth + ORM + migrations fit long-lived catalog and audit requirements.

## 5) Communication Patterns

### Synchronous (REST)
- UI and automation clients invoke Auth Gateway over REST.
- Auth Gateway proxies request paths to Topology/Analysis/Registry.
- Analysis performs synchronous data retrieval from Topology for immediate impact responses.

### Asynchronous (NATS Events)
- Services publish domain events such as service/dependency updates.
- Downstream consumers can update caches, trigger recalculations, or persist snapshots.
- NATS is used for low-latency, lightweight fan-out and eventual consistency tasks.

## 6) Data Storage Strategy

### PostgreSQL (Relational, authoritative records)
- User, team, ownership, and registry entities requiring strong consistency.
- Query-heavy filtering, joins, and audit-friendly structured data.

### MongoDB (Flexible graph persistence)
- Topology nodes/edges and evolving graph document shapes.
- Fast document upserts for ingestion workloads and snapshot storage.

### Redis (Performance + transient state)
- Hot-path cache for graph/query responses and token/session support.
- Queue/result buffering for async analysis execution status.

### NATS (Event transport, not long-term storage)
- Lightweight pub/sub and request/reply messaging among services.
- Supports decoupled workflows without introducing heavy broker operations.

# ADR 002: NestJS for Graph Services

- **Status:** Accepted

## Context
Topology workflows require strict API contracts, dependency injection, real-time websocket updates, and maintainable modular code for ingestion and query operations.

## Decision
Use NestJS for graph-facing service implementation, especially Topology and gateway-oriented orchestration concerns.

## Consequences
- **Positive:** Strong TypeScript typing, first-class websocket support, and robust modular architecture.
- **Positive:** Built-in integrations for OpenAPI, health checks, and middleware/guards/interceptors.
- **Negative:** Higher framework abstraction than minimal Node servers.
- **Mitigation:** Keep modules bounded by clear domain responsibilities.

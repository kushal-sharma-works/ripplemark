# ADR 005: MongoDB for Graph Storage

- **Status:** Accepted

## Context
Topology ingestion produces evolving node/edge metadata with variable shape over time, plus frequent upserts from discovery pipelines.

## Decision
Use MongoDB as the primary persistence layer for dependency graph structures and snapshots.

## Consequences
- **Positive:** Flexible schema supports evolving graph attributes without disruptive migrations.
- **Positive:** Efficient document-oriented persistence for node/edge-centric workloads.
- **Negative:** Cross-document relational constraints are weaker than in SQL.
- **Mitigation:** Enforce integrity at service/domain layer and via ingestion validation.

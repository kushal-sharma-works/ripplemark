# ADR 001: Monorepo Structure

- **Status:** Accepted

## Context
Ripplemark is composed of multiple backend services, a frontend, shared contracts, shared utility libraries, and platform infrastructure (Helm/K8s/ArgoCD). Coordinating changes across these components is frequent, especially for API evolution and release operations.

## Decision
Adopt a monorepo containing all apps, libraries, infra manifests, CI/CD workflows, and docs.

## Consequences
- **Positive:** Atomic cross-service changes, single source of truth for contracts/docs, simplified dependency graph visibility.
- **Positive:** Unified CI/CD and policy enforcement.
- **Negative:** Larger repository checkout and potentially heavier CI if change detection is not optimized.
- **Mitigation:** Path-filtered pipelines and service-scoped matrices.

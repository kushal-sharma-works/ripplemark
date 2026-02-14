# ADR 003: FastAPI for Analysis

- **Status:** Accepted

## Context
Impact analysis and simulation are algorithm-heavy workloads that benefit from Python’s ecosystem and rapid iteration.

## Decision
Use FastAPI for the Analysis Service instead of Django.

## Consequences
- **Positive:** Excellent fit for computational APIs, async I/O, and Pydantic-driven schema validation.
- **Positive:** Faster delivery for data-processing endpoints and simulation experiments.
- **Negative:** Introduces a second backend framework in the platform.
- **Mitigation:** Keep API contracts explicit via shared OpenAPI docs and common auth conventions.

# ADR 004: Django for Registry

- **Status:** Accepted

## Context
Registry data (services, ownership, teams, snapshots) is authoritative, relational, and requires long-term maintainability with migration safety.

## Decision
Use Django + DRF for Registry Service authoritative data management.

## Consequences
- **Positive:** Mature ORM, migrations, admin ecosystem, and robust REST patterns.
- **Positive:** Strong consistency for metadata and ownership records.
- **Negative:** More boilerplate compared with minimal frameworks.
- **Mitigation:** Restrict service scope to registry domain and standardize serializers/viewsets.

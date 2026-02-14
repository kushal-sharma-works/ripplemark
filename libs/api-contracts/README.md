# API Contracts

This package is the source of truth for Ripplemark HTTP contracts.

## Contents

- `topology-api.yaml`
- `analysis-api.yaml`
- `registry-api.yaml`
- `auth-api.yaml`

All specs are OpenAPI 3.1 and include:

- endpoint definitions
- request/response schemas with examples
- auth requirements
- common error responses (`400`, `401`, `403`, `404`, `500`)
- shared schema definitions (`ServiceNode`, `DependencyEdge`, `ChangeProposal`, `ImpactResult`, `RiskScore`, `Team`, `User`)

## Contract-first workflow

1. Update the relevant OpenAPI spec first.
2. Review contract changes with service owners.
3. Implement service changes to match the updated spec.
4. Validate implementation payloads/status codes against the contract.

## Recommended validation

- Use OpenAPI linters (for example, `spectral`) in CI.
- Add service-level integration tests that assert schema/status compliance.
- Reject PRs that diverge from these contract files.

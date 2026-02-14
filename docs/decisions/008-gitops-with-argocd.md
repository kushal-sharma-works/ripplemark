# ADR 008: GitOps with ArgoCD

- **Status:** Accepted

## Context
Platform deployments span multiple services, environments, and Helm charts, requiring traceability and reproducibility.

## Decision
Use GitOps with ArgoCD to reconcile cluster state from version-controlled manifests.

## Consequences
- **Positive:** Declarative, auditable, and repeatable deployments with clear drift detection.
- **Positive:** Environment promotion through pull requests and review workflows.
- **Negative:** Requires discipline in manifest hygiene and chart/version governance.
- **Mitigation:** Maintain environment overlays and enforce CI validation for manifests/charts.

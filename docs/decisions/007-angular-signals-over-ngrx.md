# ADR 007: Angular Signals over NgRx

- **Status:** Accepted

## Context
The web app requires responsive state updates for graph and analysis workflows with minimal boilerplate.

## Decision
Adopt Angular Signals and resource APIs as the default state mechanism instead of introducing NgRx.

## Consequences
- **Positive:** Reduced ceremony and faster feature iteration for medium-complexity state needs.
- **Positive:** Native Angular reactivity with straightforward composition.
- **Negative:** Fewer standardized enterprise patterns than full Redux-style stores.
- **Mitigation:** Introduce NgRx selectively only if state complexity or debugging requirements exceed Signals patterns.

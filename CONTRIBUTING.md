# Contributing

## Branch naming

Use descriptive branches with a scope prefix:

- `feat/<topic>` for features
- `fix/<topic>` for bug fixes
- `docs/<topic>` for documentation
- `chore/<topic>` for maintenance

For prompt-driven work, prefer `feat/prompt<number>-<summary>`.

## Conventional commits

All commits should follow Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` test additions/updates
- `chore:` maintenance
- `refactor:` non-functional code changes

Examples:

- `feat(observability): add otel tracing bootstrap for auth gateway`
- `test(integration): add cross-service impact analysis scenario`

## Pull request expectations

- Keep PR scope focused and coherent.
- Link relevant issue/prompt context in the PR description.
- Ensure tests and lint pass for touched services.
- Update docs/contracts when behavior changes.
- Highlight any breaking changes explicitly.

## PR checklist

- [ ] Branch is up to date with target base branch
- [ ] Tests pass locally for changed components
- [ ] Lint passes for changed components
- [ ] Documentation updated when needed
- [ ] No unintended breaking changes

# Productivity Police

Productivity Police is a local-first Chrome extension that enforces user-defined work schedules and a shared daily distraction allowance across blacklisted websites.

The repository is currently in its foundation phase. Product implementation has not started yet. The public project references are:

1. [Product requirements](docs/specs/PRD.md)
2. [Product roadmap](ROADMAP.md)
3. [Architecture](docs/specs/ARCHITECTURE.md)
4. [Domain model](docs/specs/DOMAIN_MODEL.md)
5. [Testing strategy](docs/TESTING.md)
6. [Contributing guide](CONTRIBUTING.md)

## Planned workspace

```text
apps/extension/{background,content,popup,dashboard,manifest}
packages/{domain,integrations,i18n,storage,shared,ui}
tests/{integration,e2e}
```

The versioned specifications in `docs/specs/` are the canonical product and engineering references.

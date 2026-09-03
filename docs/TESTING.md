# Testing strategy

## Principles

TDD IDs in [the matrix](specs/TDD_MATRIX.md) define required behavior. Write a failing test before new domain behavior, then implement and refactor. Use the lowest scope capable of detecting the risk; do not duplicate the same assertion across unit, integration, and E2E without a boundary-specific reason.

Every test uses fixed clocks, explicit locale/time zone, synthetic domains, fake provider tasks, and non-personal override justifications. Tests must not call live GitHub, Jira, or Linear APIs.

## Scopes

| Scope | Planned files | Responsibility |
| --- | --- | --- |
| Domain | `packages/domain/**/*.test.ts` | Pure schedules, rules, accounting, decisions, reports |
| Package | `packages/{i18n,storage,integrations}/**/*.test.ts` | Catalog parity, repositories, migrations, provider normalization |
| Component | `apps/extension/**/*.test.tsx` | Popup, dashboard, settings, blocker semantics and interaction |
| Integration | `tests/integration/**/*.test.ts` | Chrome adapters, events, session restoration, storage failures |
| E2E | `tests/e2e/**/*.spec.ts` | Built extension loaded in Chromium for distinct critical journeys |
| Repository policy | `tooling/github/**/*.test.mjs` | Pull-request branch policy without application dependencies |

Each test file belongs to one scope. Domain tests run without Chrome globals. Integration tests use controlled adapter doubles. E2E uses a temporary browser profile and the built unpacked extension.

## Planned commands

L01 must implement real scripts; unavailable suites must fail or remain absent rather than return fake success.

| Command | Contract |
| --- | --- |
| `pnpm quality` | Formatting check, ESLint, and TypeScript; no tests |
| `pnpm test` | Active lightweight/domain projects exactly once |
| `pnpm test:unit` | Pure domain and package unit tests |
| `pnpm test:components` | UI components in jsdom |
| `pnpm test:integration` | Chrome/storage/provider adapter tests |
| `pnpm test:e2e` | Playwright Chromium with built unpacked extension |
| `pnpm build` | Production extension build plus manifest/permission audit |
| `pnpm validate` | `quality` plus lightweight tests |
| `pnpm validate:full` | All activated suites and production build, sequentially |

Before L01, governance validation uses only bundled Node:

```text
node --test tooling/github/branch-policy.test.mjs
git diff --check
```

## What to run

| Change | Sufficient verification |
| --- | --- |
| Documentation or tracking | Link review, branch-policy test when affected, and `git diff --check` |
| Pure rule | Referenced unit tests plus affected types/lint |
| Repository or migration | Targeted package/integration tests, including failure path |
| Popup/dashboard/blocker | Targeted component tests; E2E only for browser coordination |
| Chrome runtime events | Targeted integration test and one representative E2E when behavior crosses the browser boundary |
| Provider adapter | Mocked contract/auth/pagination tests; never live credentials |
| Report rendering | Snapshot unit tests, export integration, and visual inspection of representative outputs |
| Release candidate | `validate:full`, clean production build, permission audit, and manual unpacked-extension checklist |

P0 tests gate the core release. A P1 issue cannot be completed while one of its referenced P1 tests is missing or failing. Do not chase a global coverage percentage; use coverage to find untested application paths and preserve explicit regression tests.

## CI progression

The repository starts with the trusted branch-policy check. L01 activates quality, unit, and build jobs. Add integration and E2E jobs only when their first real suites exist. Pin third-party actions to immutable commit SHAs, set minimal permissions, disable credential persistence, limit runtime, and upload only synthetic failure artifacts with short retention.

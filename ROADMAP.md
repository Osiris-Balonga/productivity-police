# Productivity Police roadmap

Productivity Police is being delivered in seven incremental milestones. GitHub issues contain the detailed acceptance criteria and test identifiers for each change.

## Foundation

Create the extension workspace, localization foundation, safe storage model, migration pipeline, and initial continuous-integration checks.

## Rules and accounting

Implement work schedules, time-zone handling, canonical website rules, and accurate distraction accounting based on the active and focused browser context.

## Enforcement

Connect the domain decisions to the Chrome runtime, then add warnings, blocking, overrides, and session-safe restoration.

## Experience

Deliver the popup, dashboard, settings, localized dialogue, and the Student and Professional visual universes without changing enforcement decisions.

## Integrations

Add optional read-only task providers for GitHub, Jira, and Linear, with minimal OAuth scopes, controlled caching, and failure isolation.

## Reporting

Create immutable weekly summaries, retention controls, localized report templates, and local PDF/PNG export.

## Release readiness

Qualify the complete extension in Chromium, audit permissions and failure behavior, build the distribution package, and complete the manual release checklist.

## Delivery principles

- `dev` is the default integration branch; stable releases are promoted to `main`.
- Each issue owns a limited, independently reviewable outcome.
- Tests are derived from the public TDD matrix and added with the behavior they protect.
- Domain decisions remain independent from Chrome adapters and user-interface components.
- Permissions, persisted data, provider credentials, and local browsing information are reviewed as part of every affected change.
- Merging, deployment, and store publication remain explicit maintainer decisions.

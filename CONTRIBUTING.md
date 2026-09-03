# Contributing to Productivity Police

Read the [roadmap](ROADMAP.md), the active GitHub issue, and the relevant specifications before changing code.

## Branches and pull requests

- `dev` is the default integration branch.
- Work branches use `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `ci/`, `build/`, or `refactor/` and target `dev`.
- Only the same repository's `dev` branch may target `main`.
- Direct pushes, force pushes, branch deletion, automatic merges, squash merges, and rebase merges are not part of the workflow.
- A maintainer authorizes every merge.

## Issues and commits

One implementation issue corresponds to one stable `PP-*` ticket. Keep its acceptance criteria and TDD IDs intact. Use Conventional Commit style and include the ticket ID in the subject.

Examples:

```text
feat(schedule): evaluate multiple daily periods (PP-004)
test(storage): preserve data after migration failure (PP-025)
```

## Verification

Choose the smallest relevant scope from [docs/TESTING.md](docs/TESTING.md). Record actual commands and results in the pull request. Documentation-only changes require link review and `git diff --check`, not the application suite.

Never include secrets, real browsing history, real provider tasks, personal override justifications, or generated extension packages in a pull request.

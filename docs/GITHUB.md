# GitHub governance

## Repository model

The repository is the public `Osiris-Balonga/productivity-police`, following the maintainer's explicit visibility decision. Its tracking Project remains private. Issues are enabled; Wiki, Pages, deployment, packages, releases, and Chrome Web Store publication are not implied. No license has been selected.

- `dev` is the default integration branch.
- `main` is the stable promotion branch.
- Work branches target `dev` and use an allowed prefix.
- Only `dev` from this same repository may target `main`.
- Merge commits only; no squash, rebase, auto-merge, force push, or automatic branch deletion.
- A maintainer explicitly authorizes merges and releases.

## Bootstrap rule

The initial creation of `main` and `dev` at the same governance commit is the only direct-push exception. The active `protect-dev` and `protect-main` rulesets forbid deletion and non-fast-forward updates, require pull requests with resolved conversations, allow merge commits only, and require the trusted `branch-policy` check. Neither ruleset has a bypass actor.

## Required checks

The repository starts with the trusted `branch-policy` check. L01 adds application checks progressively:

- `quality`: formatting, lint, and TypeScript.
- `unit-tests`: domain and lightweight component tests.
- `build`: extension production build and manifest audit.
- `integration-tests`: storage and Chrome adapters when activated.
- `e2e-chromium`: loaded-extension journeys when activated.

A conditional suite must expose a stable success/not-applicable check before it becomes required. Do not require a check that has never run successfully on the repository.

## Pull-request source policy

The `pull_request_target` workflow reads policy only from the trusted base commit. It never checks out, installs, builds, or executes code from a proposed branch. `dev` accepts branches with `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `ci/`, `build/`, or `refactor/`, plus same-repository `dependabot/` branches. `main` accepts only same-repository `dev`.

## Tracking model

Create one issue per `PP-*` ticket using the stable marker `<!-- productivity-police:ticket:PP-NNN -->`. Each issue includes:

- owning lot and dependencies;
- deliverable and acceptance criteria;
- exact TDD IDs;
- planned branch and commit subject;
- verification expectations.

GitHub milestones correspond to L01–L07. A private **Productivity Police V1** Project tracks all ticket issues with native fields:

- Status: `Backlog`, `Ready`, `In progress`, `In review`, `Blocked`, `Done`;
- Lot: text;
- Priority: `P0`, `P1`, `P2`.

Do not duplicate Priority as a label. Labels remain limited to type and area.

## State transitions

| Moment | Required update |
| --- | --- |
| Dependency merged | Mark the next issue Ready |
| Work actually starts | Set issue/status to In progress |
| Local verification complete | Record commands and results in the pull request; do not close |
| PR opened | Link the issue and set In review |
| Concrete blocker | Record cause and resumption condition; set Blocked |
| Authorized merge observed | Close the issue and set Done |
| Release verified | Mark PP-030 released only after the authorized release action |

Administrative commands use the authenticated `gh` session. Never print, copy, or store its token. Remote setup and the public-visibility decision do not authorize merging, deployment, release publication, or store publication.

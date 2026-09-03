# Dependency policy

All production and development dependencies are pinned exactly in the lockfile and root manifest. Dependencies are added only when an owned issue needs them.

| Dependency                                | Purpose                                  | License    | Bundle impact                              |
| ----------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------ |
| TypeScript                                | Static type checking for every workspace | Apache-2.0 | Development only                           |
| Vite                                      | Build the Manifest V3 extension entries  | MIT        | Build tool only; emits application modules |
| Vitest                                    | Unit and integration test runner         | MIT        | Development only                           |
| ESLint, `@eslint/js`, `typescript-eslint` | Type-aware source analysis               | MIT        | Development only                           |
| Prettier                                  | Deterministic formatting checks          | MIT        | Development only                           |
| `@types/chrome`                           | Compile-time Chrome extension contracts  | MIT        | Types only                                 |
| `@types/node`                             | Compile-time Node.js tooling contracts   | MIT        | Types only                                 |

The foundation deliberately includes no UI framework, runtime utility library, analytics SDK, or network client. This keeps the initial extension bundle free of third-party runtime code and leaves later choices attached to the issues that need them.

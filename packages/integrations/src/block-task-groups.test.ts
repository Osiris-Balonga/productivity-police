import { describe, expect, it } from "vitest";

import { selectBlockTaskGroups } from "./block-task-groups";

describe("block task groups", () => {
  it("INT-04 separates three connected providers and selects at most one task each", () => {
    const groups = selectBlockTaskGroups({
      configs: Object.fromEntries(
        ["github", "jira", "linear"].map((provider) => [
          provider,
          { provider, connected: true, status: "connected" },
        ]),
      ),
      caches: {
        github: cache("github", 2),
        jira: cache("jira", 3),
        linear: cache("linear", 1),
      },
    });

    expect(groups).toHaveLength(3);
    expect(
      groups.map(({ provider, taskCount }) => ({ provider, taskCount })),
    ).toEqual([
      { provider: "github", taskCount: 2 },
      { provider: "jira", taskCount: 3 },
      { provider: "linear", taskCount: 1 },
    ]);
    expect(groups.every((group) => group.task.id.endsWith("-1"))).toBe(true);
  });
});

function cache(provider: "github" | "jira" | "linear", count: number) {
  return {
    provider,
    status: "fresh",
    lastSyncedAt: "2026-09-03T20:00:00.000Z",
    tasks: Array.from({ length: count }, (_, index) => ({
      id: `${provider}-${String(index + 1)}`,
      title: `${provider} task ${String(index + 1)}`,
      url: `https://tasks.test/${provider}/${String(index + 1)}`,
      source: provider,
    })),
  };
}

import { describe, expect, it } from "vitest";

import { evaluateAccess } from "../../domain/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../storage/src";
import {
  IntegrationCacheRepository,
  refreshProviderCache,
  type ExternalTask,
  type TaskProvider,
} from "./provider-cache";

const OLD_TASK: ExternalTask = {
  id: "old-1",
  title: "Retained task",
  url: "https://tasks.test/old-1",
  source: "github",
};
const NEW_TASK: ExternalTask = {
  id: "new-1",
  title: "Fresh task",
  url: "https://tasks.test/new-1",
  priority: "high",
  source: "github",
};

function createRepository(existingCache?: unknown) {
  return new IntegrationCacheRepository(
    new VersionedStorageRepository(
      new MemoryStorageArea({
        productivityPolice: {
          schemaVersion: 1,
          integrations:
            existingCache === undefined
              ? {}
              : { caches: { github: existingCache } },
        },
      }),
    ),
  );
}

function createProvider(
  refresh: () => Promise<readonly ExternalTask[]>,
): TaskProvider {
  return {
    id: "github",
    getAssignedTasks: refresh,
    getAssignedTasksUrl: () => "https://tasks.test/assigned",
    refresh,
  };
}

describe("provider cache resilience", () => {
  it("INT-05 replaces the cache and timestamps a successful refresh", async () => {
    const repository = createRepository({
      provider: "github",
      tasks: [OLD_TASK],
      lastSyncedAt: "2026-09-03T08:00:00.000Z",
      lastSuccessAt: "2026-09-03T08:00:00.000Z",
      status: "fresh",
    });

    const result = await refreshProviderCache(
      createProvider(() => Promise.resolve([NEW_TASK])),
      repository,
      new Date("2026-09-03T09:00:00.000Z"),
    );

    expect(result).toEqual({
      provider: "github",
      tasks: [NEW_TASK],
      lastSyncedAt: "2026-09-03T09:00:00.000Z",
      lastSuccessAt: "2026-09-03T09:00:00.000Z",
      status: "fresh",
    });
    await expect(repository.read("github")).resolves.toEqual(result);
  });

  it("INT-06 keeps the last valid cache and marks it stale on failure", async () => {
    const repository = createRepository({
      provider: "github",
      tasks: [OLD_TASK],
      lastSyncedAt: "2026-09-03T08:00:00.000Z",
      lastSuccessAt: "2026-09-03T08:00:00.000Z",
      status: "fresh",
    });

    const result = await refreshProviderCache(
      createProvider(() => Promise.reject(new Error("offline"))),
      repository,
      new Date("2026-09-03T09:00:00.000Z"),
    );

    expect(result).toMatchObject({
      tasks: [OLD_TASK],
      lastSyncedAt: "2026-09-03T09:00:00.000Z",
      lastSuccessAt: "2026-09-03T08:00:00.000Z",
      status: "stale",
      errorCode: "PROVIDER_ERROR",
    });
  });

  it("INT-07 exposes no task when a first refresh fails", async () => {
    const repository = createRepository();

    const result = await refreshProviderCache(
      createProvider(() => Promise.reject(new Error("offline"))),
      repository,
      new Date("2026-09-03T09:00:00.000Z"),
    );

    expect(result).toMatchObject({
      provider: "github",
      tasks: [],
      status: "unavailable",
      errorCode: "PROVIDER_ERROR",
    });
  });

  it("INT-08 leaves local enforcement independent from provider failure", async () => {
    await refreshProviderCache(
      createProvider(() => Promise.reject(new Error("offline"))),
      createRepository(),
      new Date("2026-09-03T09:00:00.000Z"),
    );

    expect(
      evaluateAccess({
        enabled: true,
        overrideValid: false,
        websiteResolution: "BLACKLIST",
        scheduleState: "ON_DUTY",
        usedSeconds: 600,
        allowanceSeconds: 600,
      }),
    ).toEqual({ action: "BLOCK", reason: "ALLOWANCE_EXHAUSTED" });
  });
});

import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  DailyUsageRepository,
  MemoryStorageArea,
  VersionedStorageRepository,
} from "./index";

function createRepository(area: MemoryStorageArea): DailyUsageRepository {
  return new DailyUsageRepository(new VersionedStorageRepository(area));
}

describe("daily distraction usage", () => {
  it("ENF-09 accumulates usage across blacklisted sites", async () => {
    const repository = createRepository(
      new MemoryStorageArea({
        productivityPolice: {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          usageByDate: {},
        },
      }),
    );

    await repository.add("2026-09-03", "video-site", 600);
    await repository.add("2026-09-03", "social-site", 300);

    await expect(repository.read("2026-09-03")).resolves.toEqual({
      localDate: "2026-09-03",
      usedSeconds: 900,
      bySiteSeconds: { "video-site": 600, "social-site": 300 },
      warningTriggered: false,
      exhaustedTriggered: false,
    });
  });

  it("ENF-10 preserves accumulated usage when a session resumes", async () => {
    const area = new MemoryStorageArea({
      productivityPolice: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        usageByDate: {},
      },
    });

    await createRepository(area).add("2026-09-03", "video-site", 600);
    await createRepository(area).add("2026-09-03", "video-site", 300);

    await expect(
      createRepository(area).read("2026-09-03"),
    ).resolves.toMatchObject({
      usedSeconds: 900,
      bySiteSeconds: { "video-site": 900 },
    });
  });

  it("ENF-11 starts a new local day at zero without rewriting prior usage", async () => {
    const area = new MemoryStorageArea({
      productivityPolice: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        usageByDate: {},
      },
    });
    const repository = createRepository(area);

    await repository.add("2026-09-03", "video-site", 600);

    await expect(repository.read("2026-09-04")).resolves.toMatchObject({
      localDate: "2026-09-04",
      usedSeconds: 0,
      bySiteSeconds: {},
    });
    await expect(repository.read("2026-09-03")).resolves.toMatchObject({
      usedSeconds: 600,
    });
  });
});

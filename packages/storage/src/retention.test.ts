import { describe, expect, it } from "vitest";

import {
  MemoryStorageArea,
  VersionedStorageRepository,
  deleteActivityHistory,
  purgeExpiredActivity,
  resetAllData,
} from "./index";

function createStorage() {
  return new VersionedStorageRepository(
    new MemoryStorageArea({
      productivityPolice: {
        schemaVersion: 1,
        settings: { locale: "en" },
        activity: [
          {
            id: "expired",
            type: "WEBSITE_BLOCKED",
            occurredAt: "2026-06-04T11:59:59.999Z",
          },
          {
            id: "boundary",
            type: "WEBSITE_BLOCKED",
            occurredAt: "2026-06-04T12:00:00.000Z",
          },
          {
            id: "recent",
            type: "OVERRIDE_GRANTED",
            occurredAt: "2026-09-01T12:00:00.000Z",
          },
        ],
        reports: [{ id: "immutable-snapshot" }],
        usageByDate: { "2026-09-01": { usedSeconds: 30 } },
      },
    }),
  );
}

describe("local retention controls", () => {
  it("RET-01 purges activity older than 90 days", async () => {
    const storage = createStorage();

    await purgeExpiredActivity(storage, new Date("2026-09-02T12:00:00.000Z"));

    expect((await storage.read())?.activity).toEqual([
      expect.objectContaining({ id: "boundary" }),
      expect.objectContaining({ id: "recent" }),
    ]);
  });

  it("RET-02 never removes immutable weekly snapshots", async () => {
    const storage = createStorage();

    await purgeExpiredActivity(storage, new Date("2026-09-02T12:00:00.000Z"));

    expect((await storage.read())?.reports).toEqual([
      { id: "immutable-snapshot" },
    ]);
  });

  it("RET-03 deletes activity history while preserving settings and reports", async () => {
    const storage = createStorage();

    await deleteActivityHistory(storage);

    await expect(storage.read()).resolves.toMatchObject({
      settings: { locale: "en" },
      activity: [],
      reports: [{ id: "immutable-snapshot" }],
    });
  });

  it("RET-04 removes the complete versioned local data envelope", async () => {
    const storage = createStorage();

    await resetAllData(storage);

    await expect(storage.read()).resolves.toBeUndefined();
  });
});

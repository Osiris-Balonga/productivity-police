import { describe, expect, it } from "vitest";

import { materializeMissingWeeklyReports } from "../../packages/storage/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../packages/storage/src";

describe("weekly report recovery", () => {
  it("REP-08 creates a missed closed period exactly once across restarts", async () => {
    const storage = new VersionedStorageRepository(
      new MemoryStorageArea({
        productivityPolice: {
          schemaVersion: 1,
          settings: {
            universe: "student",
            dailyAllowanceMinutes: 30,
            schedule: {
              days: [
                {
                  weekday: "monday",
                  enabled: true,
                  periods: [{ start: "09:00", end: "17:00" }],
                },
              ],
            },
          },
          usageByDate: {
            "2026-08-24": {
              localDate: "2026-08-24",
              usedSeconds: 120,
              bySiteSeconds: { video: 120 },
              warningTriggered: false,
              exhaustedTriggered: false,
            },
          },
          activity: [],
          reports: [],
        },
      }),
    );
    const now = new Date("2026-09-02T10:00:00.000Z");

    await materializeMissingWeeklyReports(storage, now, { timeZone: "UTC" });
    await materializeMissingWeeklyReports(storage, now, { timeZone: "UTC" });

    const reports = (await storage.read())?.reports;
    expect(reports).toEqual([
      expect.objectContaining({
        id: "weekly-2026-08-24-2026-08-31",
        distractionSeconds: 120,
      }),
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { PopupController } from "../../apps/extension/src/popup/popup-controller";
import { WEEKDAYS } from "../../packages/domain/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../packages/storage/src";

describe("popup experience", () => {
  it("UI-01 shows BREAK without consuming the persisted allowance", async () => {
    const area = new MemoryStorageArea({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          locale: "fr",
          universe: "student",
          dailyAllowanceMinutes: 10,
          schedule: {
            days: WEEKDAYS.map((weekday) => ({
              weekday,
              enabled: weekday === "monday",
              periods:
                weekday === "monday"
                  ? [
                      { start: "09:00", end: "10:00" },
                      { start: "11:00", end: "12:00" },
                    ]
                  : [],
            })),
          },
        },
        usageByDate: {
          "2026-09-07": {
            localDate: "2026-09-07",
            usedSeconds: 180,
            bySiteSeconds: { video: 180 },
            warningTriggered: false,
            exhaustedTriggered: false,
          },
        },
      },
    });
    const storage = new VersionedStorageRepository(area);
    const controller = new PopupController(storage, {
      now: () => new Date("2026-09-07T10:30:00.000Z"),
      timeZone: { timeZone: "UTC" },
    });

    await expect(controller.read()).resolves.toMatchObject({
      locale: "fr",
      universe: "student",
      scheduleState: "BREAK",
      usedSeconds: 180,
      remainingSeconds: 420,
      usagePercent: 30,
    });

    expect(
      (await area.get("productivityPolice")).productivityPolice,
    ).toMatchObject({
      usageByDate: { "2026-09-07": { usedSeconds: 180 } },
    });
  });
});

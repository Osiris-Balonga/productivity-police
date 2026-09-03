import { describe, expect, it } from "vitest";

import { DashboardController } from "../../apps/extension/src/dashboard/dashboard-controller";
import { WEEKDAYS } from "../../packages/domain/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../packages/storage/src";

describe("dashboard repositories", () => {
  it("UI-02 builds dashboard and Activity view models from persisted repositories", async () => {
    const storage = new VersionedStorageRepository(
      new MemoryStorageArea({
        productivityPolice: {
          schemaVersion: 1,
          settings: {
            enabled: true,
            locale: "en",
            universe: "pro",
            dailyAllowanceMinutes: 10,
            schedule: {
              days: WEEKDAYS.map((weekday) => ({
                weekday,
                enabled: weekday === "monday",
                periods:
                  weekday === "monday"
                    ? [{ start: "09:00", end: "12:00" }]
                    : [],
              })),
            },
          },
          websiteRules: [],
          usageByDate: {
            "2026-09-07": {
              localDate: "2026-09-07",
              usedSeconds: 240,
              bySiteSeconds: { "video-site": 240 },
              warningTriggered: false,
              exhaustedTriggered: false,
            },
          },
          activity: [
            {
              id: "older",
              type: "DISTRACTION_STARTED",
              occurredAt: "2026-09-07T09:10:00.000Z",
              siteId: "video-site",
            },
            {
              id: "newer",
              type: "OVERRIDE_GRANTED",
              occurredAt: "2026-09-07T09:20:00.000Z",
              siteId: "video-site",
              metadata: { justification: "Required reference material" },
            },
          ],
        },
      }),
    );
    const controller = new DashboardController(storage, {
      now: () => new Date("2026-09-07T10:00:00.000Z"),
      timeZone: { timeZone: "UTC" },
    });

    const dashboard = await controller.readDashboard();
    const activity = await controller.readActivity();

    expect(dashboard).toMatchObject({
      locale: "en",
      universe: "pro",
      scheduleState: "ON_DUTY",
      usedSeconds: 240,
      allowanceSeconds: 600,
      remainingSeconds: 360,
      usagePercent: 40,
    });
    expect(activity.events.map((event) => event.id)).toEqual([
      "newer",
      "older",
    ]);
  });
});

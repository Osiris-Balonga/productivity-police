import { describe, expect, it, vi } from "vitest";

import { SettingsController } from "../../apps/extension/src/dashboard/settings-controller";
import { WEEKDAYS } from "../../packages/domain/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../packages/storage/src";

describe("settings application", () => {
  it("I18N-04, SCH-04, and WEB-04 preserve business history and request one immediate reevaluation", async () => {
    const repository = new VersionedStorageRepository(
      new MemoryStorageArea({
        productivityPolice: {
          schemaVersion: 1,
          settings: {
            enabled: true,
            locale: "fr",
            universe: "student",
            dailyAllowanceMinutes: 30,
            schedule: { days: [] },
          },
          websiteRules: [],
          usageByDate: { "2026-09-03": { usedSeconds: 120 } },
          activity: [{ id: "historic-event" }],
        },
      }),
    );
    const reevaluate = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const controller = new SettingsController(repository, reevaluate);
    const schedule = {
      days: WEEKDAYS.map((weekday) => ({
        weekday,
        enabled: weekday === "monday",
        periods: weekday === "monday" ? [{ start: "10:00", end: "13:00" }] : [],
      })),
    };

    await controller.apply({
      locale: "en",
      universe: "pro",
      dailyAllowanceMinutes: 20,
      schedule,
      websiteRules: [
        {
          id: "reference-site",
          name: "Reference Site",
          domain: "WWW.Example.com/path",
          list: "blacklist",
          createdAt: "2026-09-03T10:00:00.000Z",
        },
      ],
    });

    const saved = await repository.read();
    expect(saved?.settings).toMatchObject({
      locale: "en",
      universe: "pro",
      schedule,
    });
    expect(saved?.websiteRules).toEqual([
      expect.objectContaining({ domain: "example.com" }),
    ]);
    expect(saved?.usageByDate).toEqual({
      "2026-09-03": { usedSeconds: 120 },
    });
    expect(saved?.activity).toEqual([{ id: "historic-event" }]);
    expect(reevaluate).toHaveBeenCalledOnce();
  });
});

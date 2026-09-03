import { describe, expect, it } from "vitest";

import { initializeFreshInstall } from "../../apps/extension/src/background/installation-bootstrap";
import {
  CURRENT_SCHEMA_VERSION,
  MemoryStorageArea,
} from "../../packages/storage/src";

describe("extension installation bootstrap", () => {
  it("PP-028 creates a disabled, explicitly unconfigured envelope on an empty install", async () => {
    const area = new MemoryStorageArea();

    await initializeFreshInstall(area, "fr-FR");

    await expect(area.get("productivityPolice")).resolves.toEqual({
      productivityPolice: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        onboarding: { completed: false },
        settings: {
          enabled: false,
          locale: "fr",
          universe: "student",
          dailyAllowanceMinutes: 0,
          schedule: {
            days: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].map((weekday) => ({ weekday, enabled: false, periods: [] })),
          },
        },
        websiteRules: [],
        usageByDate: {},
        activity: [],
        reports: [],
        integrations: {},
      },
    });
  });

  it("PP-028 never overwrites an existing root, including malformed state", async () => {
    const existing = new MemoryStorageArea({
      productivityPolice: { schemaVersion: "invalid", sentinel: true },
    });

    await initializeFreshInstall(existing, "en-US");

    await expect(existing.get("productivityPolice")).resolves.toEqual({
      productivityPolice: { schemaVersion: "invalid", sentinel: true },
    });
    expect(existing.writeCount).toBe(0);
  });
});

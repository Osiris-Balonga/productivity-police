import { describe, expect, it } from "vitest";

import {
  isDistractionClockState,
  resumeDistractionClock,
  type ClockObservation,
} from "../../packages/domain/src/index";
import {
  MemoryStorageArea,
  SessionValueRepository,
} from "../../packages/storage/src/index";

describe("distraction clock session restoration", () => {
  it("ENF-16 does not credit unobserved time after worker suspension", async () => {
    const area = new MemoryStorageArea();
    const repository = new SessionValueRepository(
      area,
      "distractionClockState",
      isDistractionClockState,
    );
    await repository.write({
      activeTabId: 1,
      siteId: "video-site",
      startedAt: "2026-09-03T09:00:00.000Z",
      lastAccountedAt: "2026-09-03T09:00:00.000Z",
    });
    const observation: ClockObservation = {
      enabled: true,
      scheduleState: "ON_DUTY",
      websiteResolution: "BLACKLIST",
      overrideActive: false,
      activeTab: true,
      focusedWindow: true,
      idle: false,
      tabId: 1,
      siteId: "video-site",
      localDate: "2026-09-03",
    };

    const restored = await repository.read();
    const resumed = resumeDistractionClock(
      restored ?? {},
      observation,
      new Date("2026-09-03T10:00:00.000Z"),
    );
    await repository.write(resumed.state);

    expect(resumed.accounting).toBeUndefined();
    await expect(repository.read()).resolves.toMatchObject({
      lastAccountedAt: "2026-09-03T10:00:00.000Z",
    });
  });
});

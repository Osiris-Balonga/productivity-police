import { describe, expect, it } from "vitest";

import { createWeeklyReportSnapshot } from "./reporting";

const INPUT = {
  id: "report-2026-08-24",
  periodStart: "2026-08-24",
  periodEnd: "2026-08-31",
  universe: "student" as const,
  distractionSeconds: 900,
  allowanceSeconds: 3600,
  configuredDays: 5,
  daysWithinAllowance: 4,
  warningCount: 1,
  blockedCount: 2,
  overrideCount: 1,
  siteBreakdown: [{ siteId: "video", distractionSeconds: 900 }],
  overrideEntries: [
    {
      occurredAt: "2026-08-27T10:00:00.000Z",
      siteId: "video",
      justification: "Synthetic work reference",
    },
  ],
  createdAt: "2026-08-31T00:00:00.000Z",
};

describe("weekly report snapshots", () => {
  it("REP-01 creates an immutable snapshot when a period closes", () => {
    const snapshot = createWeeklyReportSnapshot(INPUT);

    expect(snapshot).toEqual(INPUT);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.siteBreakdown)).toBe(true);
    expect(Object.isFrozen(snapshot.overrideEntries[0])).toBe(true);
  });

  it("REP-02 keeps the universe captured when the snapshot closed", () => {
    const snapshot = createWeeklyReportSnapshot(INPUT);

    expect(snapshot.universe).toBe("student");
    expect(
      createWeeklyReportSnapshot({ ...INPUT, universe: "pro" }).universe,
    ).toBe("pro");
  });

  it("REP-03 stores no locale-dependent report data", () => {
    const snapshot = createWeeklyReportSnapshot(INPUT);

    expect(snapshot).not.toHaveProperty("locale");
    expect(snapshot.distractionSeconds).toBe(900);
  });
});

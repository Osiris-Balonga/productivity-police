import { describe, expect, it } from "vitest";

import {
  calculateWeeklyReport,
  getLocalWeekPeriod,
  type WeeklyReportCalculationInput,
} from "./reporting";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const INPUT: WeeklyReportCalculationInput = {
  periodStart: "2026-08-24",
  periodEnd: "2026-08-31",
  universe: "pro",
  dailyAllowanceMinutes: 15,
  schedule: {
    days: WEEKDAYS.map((weekday, index) => ({
      weekday,
      enabled: index < 5,
      periods: index < 5 ? [{ start: "09:00", end: "17:00" }] : [],
    })),
  },
  usageByDate: {
    "2026-08-24": {
      usedSeconds: 600,
      bySiteSeconds: { video: 500, social: 100 },
      warningTriggered: true,
    },
    "2026-08-25": {
      usedSeconds: 1800,
      bySiteSeconds: { video: 1800 },
      warningTriggered: false,
    },
  },
  activity: [
    {
      type: "WEBSITE_BLOCKED",
      occurredAt: "2026-08-25T10:00:00.000Z",
      siteId: "video",
    },
    {
      type: "WEBSITE_BLOCKED",
      occurredAt: "2026-08-26T10:00:00.000Z",
      siteId: "social",
    },
    {
      type: "OVERRIDE_GRANTED",
      occurredAt: "2026-08-27T10:00:00.000Z",
      siteId: "video",
      metadata: { justification: "Synthetic work reference" },
    },
  ],
  timeZone: { timeZone: "UTC" },
  createdAt: "2026-08-31T00:00:00.000Z",
};

describe("weekly report calculation", () => {
  it("REP-06 calculates the normative weekly metrics", () => {
    const report = calculateWeeklyReport(INPUT);

    expect(report).toMatchObject({
      id: "weekly-2026-08-24-2026-08-31",
      distractionSeconds: 2400,
      allowanceSeconds: 4500,
      configuredDays: 5,
      daysWithinAllowance: 4,
      warningCount: 1,
      blockedCount: 2,
      overrideCount: 1,
      siteBreakdown: [
        { siteId: "video", distractionSeconds: 2300 },
        { siteId: "social", distractionSeconds: 100 },
      ],
    });
  });

  it("REP-07 retains local override justifications in the snapshot", () => {
    expect(calculateWeeklyReport(INPUT).overrideEntries).toEqual([
      {
        occurredAt: "2026-08-27T10:00:00.000Z",
        siteId: "video",
        justification: "Synthetic work reference",
      },
    ]);
  });

  it("REP-09 uses Monday-inclusive local calendar periods", () => {
    const instant = new Date("2026-08-31T00:30:00.000Z");

    expect(
      getLocalWeekPeriod(instant, { timeZone: "America/Los_Angeles" }),
    ).toEqual({ start: "2026-08-24", end: "2026-08-31" });
    expect(getLocalWeekPeriod(instant, { timeZone: "Asia/Tokyo" })).toEqual({
      start: "2026-08-31",
      end: "2026-09-07",
    });
  });
});

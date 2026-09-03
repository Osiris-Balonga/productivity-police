import { describe, expect, it } from "vitest";

import { evaluateWorkScheduleAt, type WorkSchedule } from "./index";

describe("system time-zone schedule evaluation", () => {
  it("SCH-05 recalculates the current state when the system time zone changes", () => {
    const schedule: WorkSchedule = {
      days: [
        {
          weekday: "monday",
          enabled: true,
          periods: [{ start: "09:00", end: "12:00" }],
        },
      ],
    };
    const originalSchedule = structuredClone(schedule);
    const instant = new Date("2026-09-07T13:30:00.000Z");

    expect(
      evaluateWorkScheduleAt(schedule, instant, {
        timeZone: "Pacific/Honolulu",
      }),
    ).toBe("OFF_DUTY");
    expect(
      evaluateWorkScheduleAt(schedule, instant, {
        timeZone: "America/New_York",
      }),
    ).toBe("ON_DUTY");
    expect(schedule).toEqual(originalSchedule);
  });

  it("SCH-06 follows the operating system DST conversion", () => {
    const schedule: WorkSchedule = {
      days: [
        {
          weekday: "sunday",
          enabled: true,
          periods: [{ start: "03:00", end: "04:00" }],
        },
      ],
    };
    const context = { timeZone: "America/New_York" };

    expect(
      evaluateWorkScheduleAt(
        schedule,
        new Date("2026-03-08T06:30:00.000Z"),
        context,
      ),
    ).toBe("OFF_DUTY");
    expect(
      evaluateWorkScheduleAt(
        schedule,
        new Date("2026-03-08T07:30:00.000Z"),
        context,
      ),
    ).toBe("ON_DUTY");
  });
});

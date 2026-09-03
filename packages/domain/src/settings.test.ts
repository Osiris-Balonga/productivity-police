import { describe, expect, it } from "vitest";

import { applySettingsPatch, type ProductSettings } from "./settings";
import { WEEKDAYS } from "./schedule";

const current: ProductSettings = {
  enabled: true,
  locale: "fr",
  universe: "student",
  dailyAllowanceMinutes: 30,
  schedule: {
    days: WEEKDAYS.map((weekday) => ({
      weekday,
      enabled: weekday === "monday",
      periods: weekday === "monday" ? [{ start: "09:00", end: "12:00" }] : [],
    })),
  },
};

describe("settings changes", () => {
  it("SCH-04 applies a valid schedule without mutating the previous settings", () => {
    const original = structuredClone(current);
    const schedule = {
      days: current.schedule.days.map((day) =>
        day.weekday === "monday"
          ? { ...day, periods: [{ start: "10:00", end: "13:00" }] }
          : day,
      ),
    };

    const updated = applySettingsPatch(current, { schedule });

    expect(updated.schedule).toEqual(schedule);
    expect(current).toEqual(original);
  });

  it("rejects an invalid schedule or negative allowance", () => {
    expect(() =>
      applySettingsPatch(current, {
        schedule: {
          days: [
            {
              weekday: "monday",
              enabled: true,
              periods: [{ start: "12:00", end: "09:00" }],
            },
          ],
        },
      }),
    ).toThrow(RangeError);
    expect(() =>
      applySettingsPatch(current, { dailyAllowanceMinutes: -1 }),
    ).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";

import {
  evaluateWorkSchedule,
  type LocalScheduleTime,
  type WorkSchedule,
} from "./index";

const mondaySchedule: WorkSchedule = {
  days: [
    {
      weekday: "monday",
      enabled: true,
      periods: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
    },
  ],
};

function mondayAt(time: string): LocalScheduleTime {
  return { weekday: "monday", time };
}

describe("work schedule evaluation", () => {
  it("SCH-01 returns ON_DUTY during a configured work period", () => {
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("09:30"))).toBe(
      "ON_DUTY",
    );
  });

  it("SCH-02 returns BREAK between two work periods", () => {
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("13:00"))).toBe(
      "BREAK",
    );
  });

  it("SCH-03 returns OFF_DUTY after the final work period", () => {
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("20:00"))).toBe(
      "OFF_DUTY",
    );
  });
});

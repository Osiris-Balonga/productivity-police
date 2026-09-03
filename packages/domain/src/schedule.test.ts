import { describe, expect, it } from "vitest";

import {
  evaluateWorkSchedule,
  validateWorkSchedule,
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

  it("SCH-07 treats work periods as start-inclusive and end-exclusive", () => {
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("09:00"))).toBe(
      "ON_DUTY",
    );
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("12:00"))).toBe(
      "BREAK",
    );
    expect(evaluateWorkSchedule(mondaySchedule, mondayAt("18:00"))).toBe(
      "OFF_DUTY",
    );
  });

  it("SCH-08 rejects overlapping periods", () => {
    const errors = validateWorkSchedule({
      days: [
        {
          weekday: "monday",
          enabled: true,
          periods: [
            { start: "09:00", end: "12:00" },
            { start: "11:30", end: "14:00" },
          ],
        },
      ],
    });

    expect(errors.map((error) => error.code)).toEqual(["OVERLAPPING_PERIODS"]);
  });

  it("SCH-09 rejects periods that cross midnight", () => {
    const errors = validateWorkSchedule({
      days: [
        {
          weekday: "monday",
          enabled: true,
          periods: [{ start: "22:00", end: "02:00" }],
        },
      ],
    });

    expect(errors.map((error) => error.code)).toEqual(["OVERNIGHT_PERIOD"]);
  });
});

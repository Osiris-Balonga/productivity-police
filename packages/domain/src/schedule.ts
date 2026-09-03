export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type ScheduleState = "ON_DUTY" | "BREAK" | "OFF_DUTY";

export interface WorkPeriod {
  start: string;
  end: string;
}

export interface WorkDay {
  weekday: Weekday;
  enabled: boolean;
  periods: readonly WorkPeriod[];
}

export interface WorkSchedule {
  days: readonly WorkDay[];
}

export interface LocalScheduleTime {
  weekday: Weekday;
  time: string;
}

export type ScheduleValidationErrorCode =
  "INVALID_TIME" | "EMPTY_PERIOD" | "OVERNIGHT_PERIOD" | "OVERLAPPING_PERIODS";

export interface ScheduleValidationError {
  code: ScheduleValidationErrorCode;
  weekday: Weekday;
  periodIndex: number;
}

function toMinuteOfDay(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  const hours = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  const minutes = match?.[2] === undefined ? Number.NaN : Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new RangeError(`Invalid local schedule time: ${time}`);
  }

  return hours * 60 + minutes;
}

export function evaluateWorkSchedule(
  schedule: WorkSchedule,
  localTime: LocalScheduleTime,
): ScheduleState {
  const day = schedule.days.find(
    (candidate) => candidate.weekday === localTime.weekday,
  );

  if (day?.enabled !== true || day.periods.length === 0) {
    return "OFF_DUTY";
  }

  const minute = toMinuteOfDay(localTime.time);
  const periods = day.periods.map((period) => ({
    start: toMinuteOfDay(period.start),
    end: toMinuteOfDay(period.end),
  }));

  if (periods.some((period) => minute >= period.start && minute < period.end)) {
    return "ON_DUTY";
  }

  const firstStart = Math.min(...periods.map((period) => period.start));
  const finalEnd = Math.max(...periods.map((period) => period.end));

  return minute > firstStart && minute < finalEnd ? "BREAK" : "OFF_DUTY";
}

export function validateWorkSchedule(
  schedule: WorkSchedule,
): readonly ScheduleValidationError[] {
  const errors: ScheduleValidationError[] = [];

  for (const day of schedule.days) {
    const validPeriods: {
      start: number;
      end: number;
      periodIndex: number;
    }[] = [];

    day.periods.forEach((period, periodIndex) => {
      let start: number;
      let end: number;

      try {
        start = toMinuteOfDay(period.start);
        end = toMinuteOfDay(period.end);
      } catch {
        errors.push({
          code: "INVALID_TIME",
          weekday: day.weekday,
          periodIndex,
        });
        return;
      }

      if (start === end) {
        errors.push({
          code: "EMPTY_PERIOD",
          weekday: day.weekday,
          periodIndex,
        });
        return;
      }

      if (start > end) {
        errors.push({
          code: "OVERNIGHT_PERIOD",
          weekday: day.weekday,
          periodIndex,
        });
        return;
      }

      validPeriods.push({ start, end, periodIndex });
    });

    validPeriods.sort((left, right) => left.start - right.start);

    for (let index = 1; index < validPeriods.length; index += 1) {
      const previous = validPeriods[index - 1];
      const current = validPeriods[index];

      if (
        previous !== undefined &&
        current !== undefined &&
        current.start < previous.end
      ) {
        errors.push({
          code: "OVERLAPPING_PERIODS",
          weekday: day.weekday,
          periodIndex: current.periodIndex,
        });
      }
    }
  }

  return errors;
}

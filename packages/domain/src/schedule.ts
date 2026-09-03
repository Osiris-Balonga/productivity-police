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

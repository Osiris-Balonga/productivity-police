import {
  WEEKDAYS,
  evaluateWorkSchedule,
  type LocalScheduleTime,
  type ScheduleState,
  type Weekday,
  type WorkSchedule,
} from "./schedule";

export interface TimeZoneContext {
  timeZone: string;
}

function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function getSystemTimeZoneContext(): TimeZoneContext {
  return { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

export function toLocalScheduleTime(
  instant: Date,
  context: TimeZoneContext,
): LocalScheduleTime {
  if (!Number.isFinite(instant.getTime())) {
    throw new RangeError("A valid instant is required");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: context.timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const weekday = parts
    .find((part) => part.type === "weekday")
    ?.value.toLowerCase();
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (
    weekday === undefined ||
    !isWeekday(weekday) ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new RangeError("The instant could not be converted to local time");
  }

  return { weekday, time: `${hour}:${minute}` };
}

export function evaluateWorkScheduleAt(
  schedule: WorkSchedule,
  instant: Date,
  context: TimeZoneContext = getSystemTimeZoneContext(),
): ScheduleState {
  return evaluateWorkSchedule(schedule, toLocalScheduleTime(instant, context));
}

export function toLocalDate(
  instant: Date,
  context: TimeZoneContext = getSystemTimeZoneContext(),
): string {
  if (!Number.isFinite(instant.getTime())) {
    throw new RangeError("A valid instant is required");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: context.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (year === undefined || month === undefined || day === undefined) {
    throw new RangeError("The instant could not be converted to a local date");
  }

  return `${year}-${month}-${day}`;
}

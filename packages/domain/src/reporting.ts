import type { Universe } from "./universe";
import { WEEKDAYS, type WorkSchedule } from "./schedule";
import { toLocalDate, type TimeZoneContext } from "./time-zone";

export interface ReportSiteBreakdown {
  readonly siteId: string;
  readonly distractionSeconds: number;
}

export interface ReportOverrideEntry {
  readonly occurredAt: string;
  readonly siteId: string;
  readonly justification: string;
}

export interface WeeklyReportSnapshot {
  readonly id: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly universe: Universe;
  readonly distractionSeconds: number;
  readonly allowanceSeconds: number;
  readonly configuredDays: number;
  readonly daysWithinAllowance: number;
  readonly warningCount: number;
  readonly blockedCount: number;
  readonly overrideCount: number;
  readonly siteBreakdown: readonly Readonly<ReportSiteBreakdown>[];
  readonly overrideEntries: readonly Readonly<ReportOverrideEntry>[];
  readonly createdAt: string;
}

export interface ReportUsage {
  readonly usedSeconds: number;
  readonly bySiteSeconds: Readonly<Record<string, number>>;
  readonly warningTriggered: boolean;
}

export interface ReportActivity {
  readonly type: string;
  readonly occurredAt: string;
  readonly siteId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface WeeklyReportCalculationInput {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly universe: Universe;
  readonly dailyAllowanceMinutes: number;
  readonly schedule: WorkSchedule;
  readonly usageByDate: Readonly<Record<string, ReportUsage>>;
  readonly activity: readonly ReportActivity[];
  readonly timeZone: TimeZoneContext;
  readonly createdAt: string;
}

export interface LocalWeekPeriod {
  readonly start: string;
  readonly end: string;
}

export function getWeekPeriodForLocalDate(localDate: string): LocalWeekPeriod {
  assertLocalDate(localDate);
  const day = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
  const start = addLocalDays(localDate, -((day + 6) % 7));
  return { start, end: addLocalDays(start, 7) };
}

export function getLocalWeekPeriod(
  instant: Date,
  context: TimeZoneContext,
): LocalWeekPeriod {
  return getWeekPeriodForLocalDate(toLocalDate(instant, context));
}

export function calculateWeeklyReport(
  input: WeeklyReportCalculationInput,
): Readonly<WeeklyReportSnapshot> {
  assertLocalDate(input.periodStart);
  assertLocalDate(input.periodEnd);
  assertNonNegativeInteger(input.dailyAllowanceMinutes);

  const configuredWeekdays = new Set(
    input.schedule.days
      .filter((day) => day.enabled && day.periods.length > 0)
      .map((day) => day.weekday),
  );
  const configuredDays = configuredWeekdays.size;
  const dailyAllowanceSeconds = input.dailyAllowanceMinutes * 60;
  let distractionSeconds = 0;
  let daysWithinAllowance = 0;
  let warningCount = 0;
  const siteTotals = new Map<string, number>();

  for (
    let localDate = input.periodStart;
    localDate < input.periodEnd;
    localDate = addLocalDays(localDate, 1)
  ) {
    const usage = input.usageByDate[localDate];
    const weekday =
      WEEKDAYS[
        new Date(`${localDate}T00:00:00.000Z`).getUTCDay() === 0
          ? 6
          : new Date(`${localDate}T00:00:00.000Z`).getUTCDay() - 1
      ];
    if (
      weekday !== undefined &&
      configuredWeekdays.has(weekday) &&
      (usage?.usedSeconds ?? 0) <= dailyAllowanceSeconds
    ) {
      daysWithinAllowance += 1;
    }
    if (usage === undefined) continue;
    assertNonNegativeInteger(usage.usedSeconds);
    distractionSeconds += usage.usedSeconds;
    if (usage.warningTriggered) warningCount += 1;
    for (const [siteId, seconds] of Object.entries(usage.bySiteSeconds)) {
      assertIdentifier(siteId);
      assertNonNegativeInteger(seconds);
      siteTotals.set(siteId, (siteTotals.get(siteId) ?? 0) + seconds);
    }
  }

  const periodActivity = input.activity.filter((event) => {
    const localDate = toLocalDate(new Date(event.occurredAt), input.timeZone);
    return localDate >= input.periodStart && localDate < input.periodEnd;
  });
  const overrideEntries = periodActivity.flatMap((event) => {
    const justification = event.metadata?.justification;
    return event.type === "OVERRIDE_GRANTED" &&
      event.siteId !== undefined &&
      typeof justification === "string" &&
      justification.trim().length > 0
      ? [{ occurredAt: event.occurredAt, siteId: event.siteId, justification }]
      : [];
  });

  return createWeeklyReportSnapshot({
    id: `weekly-${input.periodStart}-${input.periodEnd}`,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    universe: input.universe,
    distractionSeconds,
    allowanceSeconds: dailyAllowanceSeconds * configuredDays,
    configuredDays,
    daysWithinAllowance,
    warningCount,
    blockedCount: periodActivity.filter(
      (event) => event.type === "WEBSITE_BLOCKED",
    ).length,
    overrideCount: overrideEntries.length,
    siteBreakdown: [...siteTotals.entries()]
      .map(([siteId, seconds]) => ({ siteId, distractionSeconds: seconds }))
      .sort(
        (left, right) =>
          right.distractionSeconds - left.distractionSeconds ||
          left.siteId.localeCompare(right.siteId),
      ),
    overrideEntries,
    createdAt: input.createdAt,
  });
}

export function createWeeklyReportSnapshot(
  input: WeeklyReportSnapshot,
): Readonly<WeeklyReportSnapshot> {
  assertIdentifier(input.id);
  assertLocalDate(input.periodStart);
  assertLocalDate(input.periodEnd);
  assertInstant(input.createdAt);
  for (const value of [
    input.distractionSeconds,
    input.allowanceSeconds,
    input.configuredDays,
    input.daysWithinAllowance,
    input.warningCount,
    input.blockedCount,
    input.overrideCount,
  ]) {
    assertNonNegativeInteger(value);
  }
  const siteBreakdown = Object.freeze(
    input.siteBreakdown.map((entry) => {
      assertIdentifier(entry.siteId);
      assertNonNegativeInteger(entry.distractionSeconds);
      return Object.freeze({
        siteId: entry.siteId,
        distractionSeconds: entry.distractionSeconds,
      });
    }),
  );
  const overrideEntries = Object.freeze(
    input.overrideEntries.map((entry) => {
      assertIdentifier(entry.siteId);
      assertInstant(entry.occurredAt);
      if (entry.justification.trim().length === 0) {
        throw new RangeError("A report override justification is required");
      }
      return Object.freeze({
        occurredAt: entry.occurredAt,
        siteId: entry.siteId,
        justification: entry.justification,
      });
    }),
  );
  return Object.freeze({
    id: input.id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    universe: input.universe,
    distractionSeconds: input.distractionSeconds,
    allowanceSeconds: input.allowanceSeconds,
    configuredDays: input.configuredDays,
    daysWithinAllowance: input.daysWithinAllowance,
    warningCount: input.warningCount,
    blockedCount: input.blockedCount,
    overrideCount: input.overrideCount,
    siteBreakdown,
    overrideEntries,
    createdAt: input.createdAt,
  });
}

function assertIdentifier(value: string): void {
  if (value.trim().length === 0) {
    throw new RangeError("A non-empty identifier is required");
  }
}

function assertNonNegativeInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("A non-negative integer is required");
  }
}

function assertLocalDate(value: string): void {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("A valid local date is required");
  }
}

function assertInstant(value: string): void {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value) {
    throw new RangeError("A canonical instant is required");
  }
}

function addLocalDays(localDate: string, days: number): string {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

import type { Universe } from "./universe";

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

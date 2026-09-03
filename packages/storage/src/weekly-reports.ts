import {
  calculateWeeklyReport,
  createWeeklyReportSnapshot,
  getLocalWeekPeriod,
  getWeekPeriodForLocalDate,
  toLocalDate,
  type ReportActivity,
  type ReportUsage,
  type TimeZoneContext,
  type Universe,
  type WeeklyReportSnapshot,
  type WorkSchedule,
} from "@productivity-police/domain";

import type { StorageEnvelope } from "./model";
import type { StorageRepository } from "./repository";

export class InvalidWeeklyReportsError extends Error {
  constructor(message = "Stored weekly reports are invalid") {
    super(message);
    this.name = "InvalidWeeklyReportsError";
  }
}

export class WeeklyReportRepository {
  constructor(private readonly storage: StorageRepository) {}

  async list(): Promise<readonly Readonly<WeeklyReportSnapshot>[]> {
    const envelope = await this.storage.read();
    if (envelope?.reports === undefined) return [];
    if (!Array.isArray(envelope.reports)) throw new InvalidWeeklyReportsError();
    try {
      return envelope.reports.map((report) =>
        createWeeklyReportSnapshot(report as WeeklyReportSnapshot),
      );
    } catch {
      throw new InvalidWeeklyReportsError();
    }
  }

  async saveIfAbsent(report: WeeklyReportSnapshot): Promise<boolean> {
    const envelope = await this.storage.read();
    if (envelope === undefined)
      throw new InvalidWeeklyReportsError("A storage envelope is required");
    const reports = await this.list();
    if (
      reports.some(
        (candidate) =>
          candidate.periodStart === report.periodStart &&
          candidate.periodEnd === report.periodEnd,
      )
    )
      return false;
    await this.storage.write({
      ...envelope,
      reports: [...reports, createWeeklyReportSnapshot(report)].sort(
        (left, right) => left.periodStart.localeCompare(right.periodStart),
      ),
    });
    return true;
  }
}

export async function materializeMissingWeeklyReports(
  storage: StorageRepository,
  now: Date,
  timeZone: TimeZoneContext,
): Promise<readonly Readonly<WeeklyReportSnapshot>[]> {
  const envelope = await storage.read();
  if (envelope === undefined) return [];
  const source = parseReportSource(envelope);
  const dates = [
    ...Object.keys(source.usageByDate),
    ...source.activity.map((event) =>
      toLocalDate(new Date(event.occurredAt), timeZone),
    ),
  ].sort();
  const earliest = dates[0];
  if (earliest === undefined) return [];

  const repository = new WeeklyReportRepository(storage);
  const currentPeriod = getLocalWeekPeriod(now, timeZone);
  const existing = await repository.list();
  const created: Readonly<WeeklyReportSnapshot>[] = [];
  for (
    let period = getWeekPeriodForLocalDate(earliest);
    period.end <= currentPeriod.start;
    period = getWeekPeriodForLocalDate(period.end)
  ) {
    if (
      existing.some(
        (report) =>
          report.periodStart === period.start &&
          report.periodEnd === period.end,
      )
    )
      continue;
    const report = calculateWeeklyReport({
      ...source,
      periodStart: period.start,
      periodEnd: period.end,
      timeZone,
      createdAt: now.toISOString(),
    });
    if (await repository.saveIfAbsent(report)) created.push(report);
  }
  return created;
}

function parseReportSource(envelope: StorageEnvelope): {
  universe: Universe;
  dailyAllowanceMinutes: number;
  schedule: WorkSchedule;
  usageByDate: Readonly<Record<string, ReportUsage>>;
  activity: readonly ReportActivity[];
} {
  const settings = envelope.settings as Record<string, unknown> | undefined;
  if (
    settings === undefined ||
    (settings.universe !== "student" && settings.universe !== "pro") ||
    !Number.isSafeInteger(settings.dailyAllowanceMinutes) ||
    Number(settings.dailyAllowanceMinutes) < 0 ||
    typeof settings.schedule !== "object" ||
    settings.schedule === null
  ) {
    throw new InvalidWeeklyReportsError("Report settings are invalid");
  }
  const usageByDate = envelope.usageByDate ?? {};
  const activity = envelope.activity ?? [];
  if (
    typeof usageByDate !== "object" ||
    Array.isArray(usageByDate) ||
    !Array.isArray(activity)
  )
    throw new InvalidWeeklyReportsError("Report source data is invalid");
  return {
    universe: settings.universe,
    dailyAllowanceMinutes: Number(settings.dailyAllowanceMinutes),
    schedule: settings.schedule as WorkSchedule,
    usageByDate: usageByDate as Record<string, ReportUsage>,
    activity: activity as ReportActivity[],
  };
}

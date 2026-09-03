import { getSystemTimeZoneContext } from "@productivity-police/domain";
import {
  ChromeStorageArea,
  VersionedStorageRepository,
  materializeMissingWeeklyReports,
} from "@productivity-police/storage";

export const REPORTING_ALARM = "weekly-report-maintenance";

export function startReportingRuntime(): void {
  const storage = new VersionedStorageRepository(
    new ChromeStorageArea(chrome.storage.local),
  );
  const materialize = (): Promise<unknown> =>
    materializeMissingWeeklyReports(
      storage,
      new Date(),
      getSystemTimeZoneContext(),
    );

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REPORTING_ALARM) void materialize();
  });
  void chrome.alarms.create(REPORTING_ALARM, { periodInMinutes: 60 });
  void materialize();
}

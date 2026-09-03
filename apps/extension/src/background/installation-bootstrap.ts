import { WEEKDAYS } from "@productivity-police/domain";
import { resolveInitialLocale } from "@productivity-police/i18n";
import {
  ChromeStorageArea,
  CURRENT_SCHEMA_VERSION,
  ROOT_STORAGE_KEY,
  type StorageArea,
} from "@productivity-police/storage";

export async function initializeFreshInstall(
  area: StorageArea,
  browserLanguage: string | null | undefined,
): Promise<boolean> {
  const values = await area.get(ROOT_STORAGE_KEY);
  if (Object.hasOwn(values, ROOT_STORAGE_KEY)) {
    return false;
  }

  await area.set({
    [ROOT_STORAGE_KEY]: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      onboarding: { completed: false },
      settings: {
        enabled: false,
        locale: resolveInitialLocale(browserLanguage),
        universe: "student",
        dailyAllowanceMinutes: 0,
        schedule: {
          days: WEEKDAYS.map((weekday) => ({
            weekday,
            enabled: false,
            periods: [],
          })),
        },
      },
      websiteRules: [],
      usageByDate: {},
      activity: [],
      reports: [],
      integrations: {},
    },
  });
  return true;
}

export function initializeChromeFreshInstall(): Promise<boolean> {
  return initializeFreshInstall(
    new ChromeStorageArea(chrome.storage.local),
    chrome.i18n.getUILanguage(),
  );
}

import {
  ChromeStorageArea,
  RetentionCleanupScheduler,
  VersionedStorageRepository,
  purgeExpiredActivity,
  type RetentionAlarmPort,
  type StorageArea,
} from "@productivity-police/storage";

import { reevaluateOpenTabs } from "./enforcement-orchestrator";

export async function resetExtensionRuntime(
  local: StorageArea,
  session: StorageArea,
  reevaluate: () => Promise<void>,
): Promise<void> {
  await Promise.all([local.clear(), session.clear()]);
  await reevaluate();
}

export function startRetentionRuntime(): void {
  const local = new ChromeStorageArea(chrome.storage.local);
  const session = new ChromeStorageArea(chrome.storage.session);
  const storage = new VersionedStorageRepository(local);
  const alarms: RetentionAlarmPort = {
    create: async (name, periodInMinutes) => {
      await chrome.alarms.create(name, { periodInMinutes });
    },
    onAlarm: (listener) => {
      chrome.alarms.onAlarm.addListener(listener);
    },
  };
  const scheduler = new RetentionCleanupScheduler(alarms, () =>
    purgeExpiredActivity(storage, new Date()),
  );

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isResetMessage(message)) return false;
    void resetExtensionRuntime(local, session, reevaluateTabsAfterReset)
      .then(() => {
        sendResponse({ reset: true });
      })
      .catch(() => {
        sendResponse({ reset: false });
      });
    return true;
  });
  void scheduler.start();
}

function isResetMessage(value: unknown): value is { type: "RESET_ALL_DATA" } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "RESET_ALL_DATA"
  );
}

async function reevaluateTabsAfterReset(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await reevaluateOpenTabs(
    {
      enabled: false,
      scheduleState: "OFF_DUTY",
      rules: { rules: [] },
      usedSeconds: 0,
      allowanceSeconds: 0,
      locale: "en",
      universe: "student",
      taskGroups: [],
    },
    tabs,
    async (tabId, message) => {
      try {
        await chrome.tabs.sendMessage(tabId, message);
      } catch {
        // Browser-internal pages and tabs without the content script are expected.
      }
    },
  );
}

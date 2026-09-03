import {
  ProviderRefreshScheduler,
  type ProviderAlarmPort,
  type RefreshProviders,
} from "@productivity-police/integrations";

import { isRefreshProvidersMessage } from "../provider-refresh-message";

export function startProviderRefreshRuntime(
  refreshProviders: RefreshProviders = () => Promise.resolve(),
): ProviderRefreshScheduler {
  const alarms: ProviderAlarmPort = {
    create: async (name, periodInMinutes) => {
      await chrome.alarms.create(name, { periodInMinutes });
    },
    onAlarm: (listener) => {
      chrome.alarms.onAlarm.addListener(listener);
    },
  };
  const scheduler = new ProviderRefreshScheduler(alarms, refreshProviders);
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRefreshProvidersMessage(message)) {
      return false;
    }
    void scheduler
      .refreshNow()
      .then(() => {
        sendResponse({ refreshed: true });
      })
      .catch(() => {
        sendResponse({ refreshed: false });
      });
    return true;
  });
  void scheduler.start();
  return scheduler;
}

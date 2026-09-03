import {
  evaluateWorkScheduleAt,
  getSystemTimeZoneContext,
  isDistractionClockState,
  matchWebsiteRule,
  resumeDistractionClock,
  toLocalDate,
  transitionDistractionClock,
  validateWorkSchedule,
  type ClockObservation,
  type WebsiteRule,
  type WebsiteRuleSet,
  type WorkSchedule,
} from "@productivity-police/domain";
import {
  ChromeStorageArea,
  DailyUsageRepository,
  SessionValueRepository,
  VersionedStorageRepository,
} from "@productivity-police/storage";

import { reevaluateOpenTabs } from "./enforcement-orchestrator";

const CLOCK_KEY = "distractionClockState";
const HEARTBEAT_ALARM = "distraction-heartbeat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkSchedule(value: unknown): value is WorkSchedule {
  if (!isRecord(value) || !Array.isArray(value.days)) {
    return false;
  }

  return value.days.every(
    (day) =>
      isRecord(day) &&
      typeof day.weekday === "string" &&
      typeof day.enabled === "boolean" &&
      Array.isArray(day.periods) &&
      day.periods.every(
        (period) =>
          isRecord(period) &&
          typeof period.start === "string" &&
          typeof period.end === "string",
      ),
  );
}

function isWebsiteRule(value: unknown): value is WebsiteRule {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.domain === "string" &&
    (value.list === "blacklist" || value.list === "whitelist") &&
    typeof value.createdAt === "string"
  );
}

function readRuleSet(value: unknown): WebsiteRuleSet {
  if (!Array.isArray(value) || !value.every(isWebsiteRule)) {
    return { rules: [] };
  }
  return { rules: value };
}

export function startDistractionRuntime(): void {
  const localArea = new ChromeStorageArea(chrome.storage.local);
  const sessionArea = new ChromeStorageArea(chrome.storage.session);
  const storage = new VersionedStorageRepository(localArea);
  const usage = new DailyUsageRepository(storage);
  const clock = new SessionValueRepository(
    sessionArea,
    CLOCK_KEY,
    isDistractionClockState,
  );
  let currentIdleState: "active" | "idle" | "locked" = "active";
  let pending = Promise.resolve();

  const reconcile = async (resumed: boolean): Promise<void> => {
    const now = new Date();
    const [envelope, persistedClock, focusedWindow, openTabs] =
      await Promise.all([
        storage.read(),
        clock.read(),
        chrome.windows.getLastFocused({ populate: true }),
        chrome.tabs.query({}),
      ]);
    if (envelope === undefined) {
      return;
    }

    const settings = isRecord(envelope.settings) ? envelope.settings : {};
    const schedule = settings.schedule;
    const activeTab = focusedWindow.tabs?.find((tab) => tab.active);
    const rules = readRuleSet(envelope.websiteRules);
    let matchedRule: WebsiteRule | undefined;

    if (activeTab?.url !== undefined) {
      try {
        matchedRule = matchWebsiteRule(rules, activeTab.url);
      } catch {
        matchedRule = undefined;
      }
    }

    const timeZone = getSystemTimeZoneContext();
    const scheduleState =
      isWorkSchedule(schedule) && validateWorkSchedule(schedule).length === 0
        ? evaluateWorkScheduleAt(schedule, now, timeZone)
        : "OFF_DUTY";
    const observation: ClockObservation = {
      enabled: settings.enabled === true,
      scheduleState,
      websiteResolution:
        matchedRule?.list === "whitelist"
          ? "WHITELIST"
          : matchedRule?.list === "blacklist"
            ? "BLACKLIST"
            : "NEUTRAL",
      overrideActive: false,
      activeTab: activeTab !== undefined,
      focusedWindow: focusedWindow.focused,
      idle: currentIdleState !== "active",
      localDate: toLocalDate(now, timeZone),
      ...(activeTab?.id === undefined ? {} : { tabId: activeTab.id }),
      ...(matchedRule?.id === undefined ? {} : { siteId: matchedRule.id }),
    };
    const result = resumed
      ? resumeDistractionClock(persistedClock ?? {}, observation, now)
      : transitionDistractionClock(persistedClock ?? {}, observation, now);

    const dailyUsage =
      result.accounting === undefined
        ? await usage.read(observation.localDate)
        : await usage.add(
            result.accounting.localDate,
            result.accounting.siteId,
            result.accounting.seconds,
          );
    await clock.write(result.state);

    const configuredAllowance = settings.dailyAllowanceMinutes;
    const allowanceSeconds =
      typeof configuredAllowance === "number" &&
      Number.isFinite(configuredAllowance) &&
      configuredAllowance >= 0
        ? configuredAllowance * 60
        : Number.POSITIVE_INFINITY;
    await reevaluateOpenTabs(
      {
        enabled: observation.enabled,
        scheduleState,
        rules,
        usedSeconds: dailyUsage.usedSeconds,
        allowanceSeconds,
      },
      openTabs,
      async (tabId, message) => {
        try {
          await chrome.tabs.sendMessage(tabId, message);
        } catch {
          // Tabs without an injected receiver do not need enforcement UI.
        }
      },
    );
  };

  const queueReconciliation = (resumed = false): void => {
    pending = pending.then(() => reconcile(resumed)).catch(() => undefined);
  };

  chrome.tabs.onActivated.addListener(() => {
    queueReconciliation();
  });
  chrome.tabs.onUpdated.addListener(() => {
    queueReconciliation();
  });
  chrome.tabs.onRemoved.addListener(() => {
    queueReconciliation();
  });
  chrome.windows.onFocusChanged.addListener(() => {
    queueReconciliation();
  });
  chrome.idle.onStateChanged.addListener((state) => {
    currentIdleState = state;
    queueReconciliation();
  });
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === "local") {
      queueReconciliation();
    }
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === HEARTBEAT_ALARM) {
      queueReconciliation();
    }
  });
  chrome.idle.setDetectionInterval(60);
  void chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
  void chrome.idle.queryState(60).then((state) => {
    currentIdleState = state;
    queueReconciliation(true);
  });
}

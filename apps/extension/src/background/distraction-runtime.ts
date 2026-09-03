import {
  canonicalizeDomain,
  confirmOverrideRequest,
  evaluateWorkScheduleAt,
  getSystemTimeZoneContext,
  isDistractionClockState,
  isTabOverrideValid,
  matchWebsiteRule,
  resumeDistractionClock,
  startOverrideRequest,
  submitOverrideRequest,
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
import { selectBlockTaskGroups } from "@productivity-police/integrations";

import { reevaluateOpenTabs } from "./enforcement-orchestrator";
import { SessionTabOverrideRegistry } from "./tab-override-registry";

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

function isGrantOverrideMessage(
  value: unknown,
): value is { type: "GRANT_OVERRIDE"; justification: string } {
  return (
    isRecord(value) &&
    value.type === "GRANT_OVERRIDE" &&
    typeof value.justification === "string"
  );
}

export function startDistractionRuntime(): void {
  const localArea = new ChromeStorageArea(chrome.storage.local);
  const sessionArea = new ChromeStorageArea(chrome.storage.session);
  const storage = new VersionedStorageRepository(localArea);
  const usage = new DailyUsageRepository(storage);
  const overrides = new SessionTabOverrideRegistry(sessionArea);
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
    const validOverrides = await overrides.reconcile(openTabs, rules);
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
      overrideActive:
        activeTab?.id !== undefined && matchedRule?.id !== undefined
          ? isTabOverrideValid(
              validOverrides.find(
                (override) => override.tabId === activeTab.id,
              ),
              activeTab.id,
              matchedRule.id,
            )
          : false,
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
        locale: settings.locale === "fr" ? "fr" : "en",
        universe: settings.universe === "pro" ? "pro" : "student",
        overrides: validOverrides,
        taskGroups: selectBlockTaskGroups(envelope.integrations),
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
  chrome.tabs.onRemoved.addListener((tabId) => {
    pending = pending
      .then(async () => {
        await overrides.remove(tabId);
        await reconcile(false);
      })
      .catch(() => undefined);
  });
  chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) => {
    pending = pending
      .then(async () => {
        await overrides.remove(removedTabId);
        await reconcile(false);
      })
      .catch(() => undefined);
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isGrantOverrideMessage(message)) {
      return false;
    }

    const grantRequest = pending.then(async () => {
      const tabId = sender.tab?.id;
      const url = sender.tab?.url;
      const envelope = await storage.read();
      if (tabId === undefined || url === undefined || envelope === undefined) {
        return false;
      }

      const rule = matchWebsiteRule(readRuleSet(envelope.websiteRules), url);
      if (rule?.list !== "blacklist") {
        return false;
      }

      const request = confirmOverrideRequest(
        confirmOverrideRequest(
          startOverrideRequest(tabId, rule.id, canonicalizeDomain(rule.domain)),
        ),
      );
      const grant = submitOverrideRequest(
        request,
        message.justification,
        new Date(),
      );
      if (grant.override === undefined || grant.activity === undefined) {
        return false;
      }

      await overrides.save(grant.override);
      const activity: unknown[] = Array.isArray(envelope.activity)
        ? (envelope.activity as unknown[])
        : [];
      await storage.write({
        ...envelope,
        activity: [
          ...activity,
          {
            id: crypto.randomUUID(),
            type: grant.activity.type,
            occurredAt: grant.activity.occurredAt,
            tabId: grant.activity.tabId,
            siteId: grant.activity.siteId,
            metadata: { justification: grant.activity.justification },
          },
        ],
      });
      queueReconciliation();
      return true;
    });
    pending = grantRequest.then(
      () => undefined,
      () => undefined,
    );
    void grantRequest
      .then((granted) => {
        sendResponse({ granted });
      })
      .catch(() => {
        sendResponse({ granted: false });
      });
    return true;
  });
  chrome.idle.setDetectionInterval(60);
  void chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
  void chrome.idle.queryState(60).then((state) => {
    currentIdleState = state;
    queueReconciliation(true);
  });
}

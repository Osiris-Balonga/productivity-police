import {
  evaluateAccess,
  isTabOverrideValid,
  matchWebsiteRule,
  type AccessDecision,
  type ScheduleState,
  type TabOverride,
  type WebsiteRuleSet,
} from "@productivity-police/domain";
import type { SupportedLocale } from "@productivity-police/i18n";

export interface OpenTab {
  id?: number | undefined;
  url?: string | undefined;
}

export interface EnforcementSnapshot {
  enabled: boolean;
  scheduleState: ScheduleState;
  rules: WebsiteRuleSet;
  usedSeconds: number;
  allowanceSeconds: number;
  locale: SupportedLocale;
  overrides?: readonly TabOverride[];
}

export interface EnforcementDecisionMessage {
  type: "ENFORCEMENT_DECISION";
  decision: Readonly<AccessDecision>;
  locale: SupportedLocale;
  siteId: string | undefined;
}

export type DecisionSender = (
  tabId: number,
  message: EnforcementDecisionMessage,
) => Promise<void>;

export async function reevaluateOpenTabs(
  snapshot: EnforcementSnapshot,
  tabs: readonly OpenTab[],
  sendDecision: DecisionSender,
): Promise<void> {
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || tab.url === undefined) {
        return;
      }

      let matchedRule;
      try {
        matchedRule = matchWebsiteRule(snapshot.rules, tab.url);
      } catch {
        return;
      }

      const decision = evaluateAccess({
        enabled: snapshot.enabled,
        overrideValid: isTabOverrideValid(
          snapshot.overrides?.find((override) => override.tabId === tab.id),
          tab.id,
          matchedRule?.id ?? "",
        ),
        websiteResolution:
          matchedRule?.list === "whitelist"
            ? "WHITELIST"
            : matchedRule?.list === "blacklist"
              ? "BLACKLIST"
              : "NEUTRAL",
        scheduleState: snapshot.scheduleState,
        usedSeconds: snapshot.usedSeconds,
        allowanceSeconds: snapshot.allowanceSeconds,
      });

      await sendDecision(tab.id, {
        type: "ENFORCEMENT_DECISION",
        decision,
        locale: snapshot.locale,
        siteId: matchedRule?.id,
      });
    }),
  );
}

import type { ScheduleState } from "./schedule";
import type { WebsiteRuleResolution } from "./website-rules";

export type AccessAction = "ALLOW" | "TRACK" | "WARN" | "BLOCK";

export type AccessReason =
  | "DISABLED"
  | "TAB_OVERRIDE"
  | "WHITELIST"
  | "OFF_DUTY"
  | "BREAK"
  | "NOT_BLACKLISTED"
  | "BLACKLISTED"
  | "ALLOWANCE_WARNING"
  | "ALLOWANCE_EXHAUSTED";

export interface AccessEvaluation {
  enabled: boolean;
  overrideValid: boolean;
  websiteResolution: WebsiteRuleResolution;
  scheduleState: ScheduleState;
  usedSeconds: number;
  allowanceSeconds: number;
}

export interface AccessDecision {
  readonly action: AccessAction;
  readonly reason: AccessReason;
}

const WARNING_RATIO = 0.8;

function decision(
  action: AccessAction,
  reason: AccessReason,
): Readonly<AccessDecision> {
  return Object.freeze({ action, reason });
}

export function evaluateAccess(
  evaluation: AccessEvaluation,
): Readonly<AccessDecision> {
  if (!evaluation.enabled) {
    return decision("ALLOW", "DISABLED");
  }
  if (evaluation.overrideValid) {
    return decision("ALLOW", "TAB_OVERRIDE");
  }
  if (evaluation.websiteResolution === "WHITELIST") {
    return decision("ALLOW", "WHITELIST");
  }
  if (evaluation.scheduleState !== "ON_DUTY") {
    return decision("ALLOW", evaluation.scheduleState);
  }
  if (evaluation.websiteResolution !== "BLACKLIST") {
    return decision("ALLOW", "NOT_BLACKLISTED");
  }
  if (evaluation.usedSeconds >= evaluation.allowanceSeconds) {
    return decision("BLOCK", "ALLOWANCE_EXHAUSTED");
  }
  if (
    evaluation.allowanceSeconds > 0 &&
    evaluation.usedSeconds / evaluation.allowanceSeconds >= WARNING_RATIO
  ) {
    return decision("WARN", "ALLOWANCE_WARNING");
  }
  return decision("TRACK", "BLACKLISTED");
}

import type { AccessDecision } from "./access-rule-engine";

export type Universe = "student" | "pro";

export interface ExperienceProfile {
  readonly universe: Universe;
  readonly mascot: "professor" | "manager";
  readonly dialogueNamespace: "student" | "pro";
  readonly reportKind: "report-card" | "performance-review";
}

export interface ExperienceDecision {
  readonly decision: Readonly<AccessDecision>;
  readonly profile: Readonly<ExperienceProfile>;
}

const PROFILES: Readonly<Record<Universe, Readonly<ExperienceProfile>>> =
  Object.freeze({
    student: Object.freeze({
      universe: "student",
      mascot: "professor",
      dialogueNamespace: "student",
      reportKind: "report-card",
    }),
    pro: Object.freeze({
      universe: "pro",
      mascot: "manager",
      dialogueNamespace: "pro",
      reportKind: "performance-review",
    }),
  });

export function getExperienceProfile(
  universe: Universe,
): Readonly<ExperienceProfile> {
  return PROFILES[universe];
}

export function createExperienceDecision(
  decision: AccessDecision,
  universe: Universe,
): Readonly<ExperienceDecision> {
  return Object.freeze({
    decision: Object.freeze({ ...decision }),
    profile: getExperienceProfile(universe),
  });
}

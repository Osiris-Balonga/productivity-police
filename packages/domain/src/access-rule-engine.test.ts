import { describe, expect, it } from "vitest";

import { evaluateAccess, type AccessEvaluation } from "./access-rule-engine";

const trackable: AccessEvaluation = {
  enabled: true,
  overrideValid: false,
  websiteResolution: "BLACKLIST",
  scheduleState: "ON_DUTY",
  usedSeconds: 120,
  allowanceSeconds: 600,
};

describe("access rule engine", () => {
  it("ENF-01 allows a blacklisted site when enforcement is disabled", () => {
    expect(evaluateAccess({ ...trackable, enabled: false })).toEqual({
      action: "ALLOW",
      reason: "DISABLED",
    });
  });

  it("allows a valid tab override before evaluating website and quota rules", () => {
    expect(
      evaluateAccess({
        ...trackable,
        overrideValid: true,
        usedSeconds: 600,
      }),
    ).toEqual({ action: "ALLOW", reason: "TAB_OVERRIDE" });
  });

  it("ENF-02 gives the whitelist priority when the allowance is exhausted", () => {
    expect(
      evaluateAccess({
        ...trackable,
        websiteResolution: "WHITELIST",
        usedSeconds: 600,
      }),
    ).toEqual({ action: "ALLOW", reason: "WHITELIST" });
  });

  it.each([
    ["ENF-03", "OFF_DUTY"],
    ["ENF-04", "BREAK"],
  ] as const)(
    "%s allows a blacklisted site during %s",
    (_id, scheduleState) => {
      expect(evaluateAccess({ ...trackable, scheduleState })).toEqual({
        action: "ALLOW",
        reason: scheduleState,
      });
    },
  );

  it("ENF-05 tracks a blacklisted site while allowance remains", () => {
    expect(evaluateAccess(trackable)).toEqual({
      action: "TRACK",
      reason: "BLACKLISTED",
    });
  });

  it("ENF-06 warns at the 80 percent allowance threshold", () => {
    expect(evaluateAccess({ ...trackable, usedSeconds: 480 })).toEqual({
      action: "WARN",
      reason: "ALLOWANCE_WARNING",
    });
  });

  it("ENF-07 blocks when the allowance is exhausted", () => {
    expect(evaluateAccess({ ...trackable, usedSeconds: 600 })).toEqual({
      action: "BLOCK",
      reason: "ALLOWANCE_EXHAUSTED",
    });
  });

  it("returns an immutable decision", () => {
    expect(Object.isFrozen(evaluateAccess(trackable))).toBe(true);
  });
});

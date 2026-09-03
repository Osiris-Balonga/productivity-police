import { describe, expect, it } from "vitest";

import { evaluateAccess } from "./access-rule-engine";
import { createExperienceDecision } from "./universe";

describe("experience universe", () => {
  it("UNI-01 preserves the same access decision for Student and Pro", () => {
    const decision = evaluateAccess({
      enabled: true,
      overrideValid: false,
      websiteResolution: "BLACKLIST",
      scheduleState: "ON_DUTY",
      usedSeconds: 600,
      allowanceSeconds: 600,
    });

    const student = createExperienceDecision(decision, "student");
    const pro = createExperienceDecision(decision, "pro");

    expect(student.decision).toEqual(pro.decision);
    expect(student.profile).not.toEqual(pro.profile);
    expect(student.profile.mascot).toBe("professor");
    expect(pro.profile.mascot).toBe("manager");
  });
});

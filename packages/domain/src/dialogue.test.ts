import { describe, expect, it } from "vitest";

import { selectDialogue } from "./dialogue";

describe("dialogue selection", () => {
  it("I18N-07 avoids a recent variant when another compatible one exists", () => {
    const first = selectDialogue({
      universe: "student",
      event: "BLOCKED",
      severity: "critical",
      occurrence: 1,
      timeOfDay: "afternoon",
      recentVariantIds: [],
    });
    const next = selectDialogue({
      universe: "student",
      event: "BLOCKED",
      severity: "critical",
      occurrence: 2,
      timeOfDay: "afternoon",
      recentVariantIds: [first.variantId],
    });

    expect(next.variantId).not.toBe(first.variantId);
    expect(next.messageKey).not.toBe(first.messageKey);
  });

  it("I18N-08 selects the frequent critical variant on the fifth block", () => {
    expect(
      selectDialogue({
        universe: "pro",
        event: "BLOCKED",
        severity: "critical",
        occurrence: 5,
        timeOfDay: "morning",
        recentVariantIds: ["pro.blocked.standard.1"],
      }),
    ).toEqual({
      variantId: "pro.blocked.frequent",
      messageKey: "dialogue.pro.blocked.frequent",
    });
  });

  it("uses universe and temporal context without returning localized text", () => {
    expect(
      selectDialogue({
        universe: "student",
        event: "WARNING",
        severity: "firm",
        occurrence: 1,
        timeOfDay: "morning",
        recentVariantIds: [],
      }),
    ).toEqual({
      variantId: "student.warning.morning",
      messageKey: "dialogue.student.warning.morning",
    });
  });
});

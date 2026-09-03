import { describe, expect, it } from "vitest";

import { evaluateAllowanceWarning } from "./allowance-warning";

describe("daily allowance warning", () => {
  it("ENF-17 emits once when usage reaches 80 percent for a local date", () => {
    const belowThreshold = evaluateAllowanceWarning({
      localDate: "2026-09-03",
      usedSeconds: 474,
      allowanceSeconds: 600,
      warningTriggered: false,
    });
    const thresholdReached = evaluateAllowanceWarning({
      localDate: "2026-09-03",
      usedSeconds: 480,
      allowanceSeconds: 600,
      warningTriggered: belowThreshold.warningTriggered,
    });
    const sameDateAgain = evaluateAllowanceWarning({
      localDate: "2026-09-03",
      usedSeconds: 510,
      allowanceSeconds: 600,
      warningTriggered: thresholdReached.warningTriggered,
    });
    const nextDate = evaluateAllowanceWarning({
      localDate: "2026-09-04",
      usedSeconds: 480,
      allowanceSeconds: 600,
      warningTriggered: false,
    });

    expect(belowThreshold).toEqual({
      localDate: "2026-09-03",
      warningTriggered: false,
      warningEmitted: false,
    });
    expect(thresholdReached).toEqual({
      localDate: "2026-09-03",
      warningTriggered: true,
      warningEmitted: true,
    });
    expect(sameDateAgain).toEqual({
      localDate: "2026-09-03",
      warningTriggered: true,
      warningEmitted: false,
    });
    expect(nextDate.warningEmitted).toBe(true);
  });

  it("does not emit a warning once the allowance is exhausted", () => {
    expect(
      evaluateAllowanceWarning({
        localDate: "2026-09-03",
        usedSeconds: 600,
        allowanceSeconds: 600,
        warningTriggered: false,
      }),
    ).toEqual({
      localDate: "2026-09-03",
      warningTriggered: false,
      warningEmitted: false,
    });
  });
});

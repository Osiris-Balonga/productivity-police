import { describe, expect, it } from "vitest";

import { createWeeklyReportSnapshot } from "../../packages/domain/src";
import { createReportTemplateModel } from "../../packages/reporting-export/src/report-model";

const REPORT = createWeeklyReportSnapshot({
  id: "weekly-2026-08-24-2026-08-31",
  periodStart: "2026-08-24",
  periodEnd: "2026-08-31",
  universe: "student",
  distractionSeconds: 2400,
  allowanceSeconds: 4500,
  configuredDays: 5,
  daysWithinAllowance: 4,
  warningCount: 1,
  blockedCount: 2,
  overrideCount: 1,
  siteBreakdown: [{ siteId: "video", distractionSeconds: 2400 }],
  overrideEntries: [
    {
      occurredAt: "2026-08-27T10:00:00.000Z",
      siteId: "video",
      justification: "Course research",
    },
  ],
  createdAt: "2026-08-31T00:00:00.000Z",
});

describe("localized report templates", () => {
  it("REP-04 localizes Student and Pro report copy without changing metrics", () => {
    const frenchStudent = createReportTemplateModel(REPORT, "fr");
    const englishStudent = createReportTemplateModel(REPORT, "en");
    const englishPro = createReportTemplateModel(
      { ...REPORT, universe: "pro" },
      "en",
    );

    expect(frenchStudent.title).toBe("Bulletin hebdomadaire");
    expect(englishStudent.title).toBe("Weekly report card");
    expect(englishPro.title).toBe("Weekly performance review");
    expect(frenchStudent.metrics.map(({ value }) => value)).toEqual(
      englishStudent.metrics.map(({ value }) => value),
    );
    expect(englishPro.metrics.map(({ value }) => value)).toEqual(
      englishStudent.metrics.map(({ value }) => value),
    );
    expect(frenchStudent.metrics.map(({ label }) => label)).not.toEqual(
      englishStudent.metrics.map(({ label }) => label),
    );
    expect(frenchStudent.overrideEntries[0]?.justification).toBe(
      "Course research",
    );
  });
});

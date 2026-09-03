import { describe, expect, it, vi } from "vitest";

import { createWeeklyReportSnapshot } from "../../packages/domain/src";
import { ReportExportService } from "../../packages/reporting-export/src/report-export";

const REPORT = createWeeklyReportSnapshot({
  id: "weekly-2026-08-24-2026-08-31",
  periodStart: "2026-08-24",
  periodEnd: "2026-08-31",
  universe: "pro",
  distractionSeconds: 600,
  allowanceSeconds: 3600,
  configuredDays: 5,
  daysWithinAllowance: 5,
  warningCount: 0,
  blockedCount: 1,
  overrideCount: 0,
  siteBreakdown: [{ siteId: "video", distractionSeconds: 600 }],
  overrideEntries: [],
  createdAt: "2026-08-31T00:00:00.000Z",
});

describe("on-demand report export", () => {
  it("REP-05 generates PDF and PNG files only after an explicit request", async () => {
    const render = vi
      .fn()
      .mockImplementation((_report, _locale, format: "pdf" | "png") =>
        Promise.resolve(
          new Blob([format], {
            type: format === "pdf" ? "application/pdf" : "image/png",
          }),
        ),
      );
    const exports = new ReportExportService(render);

    expect(render).not.toHaveBeenCalled();
    await expect(exports.request(REPORT, "fr", "pdf")).resolves.toMatchObject({
      filename: "productivity-police-2026-08-24-2026-08-31.pdf",
      mimeType: "application/pdf",
    });
    await expect(exports.request(REPORT, "en", "png")).resolves.toMatchObject({
      filename: "productivity-police-2026-08-24-2026-08-31.png",
      mimeType: "image/png",
    });
    expect(render).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenNthCalledWith(1, REPORT, "fr", "pdf");
    expect(render).toHaveBeenNthCalledWith(2, REPORT, "en", "png");
  });
});

import type { WeeklyReportSnapshot } from "@productivity-police/domain";

import type { ReportLocale } from "./report-model";

export type ReportExportFormat = "pdf" | "png";
export type ReportRenderer = (
  report: WeeklyReportSnapshot,
  locale: ReportLocale,
  format: ReportExportFormat,
) => Promise<Blob>;

export interface ReportExportFile {
  readonly filename: string;
  readonly mimeType: "application/pdf" | "image/png";
  readonly blob: Blob;
}

export class ReportExportService {
  constructor(private readonly render: ReportRenderer) {}

  async request(
    report: WeeklyReportSnapshot,
    locale: ReportLocale,
    format: ReportExportFormat,
  ): Promise<Readonly<ReportExportFile>> {
    const blob = await this.render(report, locale, format);
    const mimeType = format === "pdf" ? "application/pdf" : "image/png";
    if (blob.type !== mimeType || blob.size === 0) {
      throw new Error(
        `The ${format.toUpperCase()} renderer returned an invalid file`,
      );
    }
    return Object.freeze({
      filename: `productivity-police-${report.periodStart}-${report.periodEnd}.${format}`,
      mimeType,
      blob,
    });
  }
}

export function downloadReportFile(file: ReportExportFile): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.download = file.filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

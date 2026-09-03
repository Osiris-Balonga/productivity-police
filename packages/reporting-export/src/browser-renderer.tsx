import { Font, pdf } from "@react-pdf/renderer";
import type { WeeklyReportSnapshot } from "@productivity-police/domain";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

import { ProductivityReportDocument } from "./report-template";
import { ReportExportService, type ReportRenderer } from "./report-export";
import type { ReportLocale } from "./report-model";

let fontsRegistered = false;

export function createBrowserReportExportService(): ReportExportService {
  return new ReportExportService(renderReportFile);
}

export const renderReportFile: ReportRenderer = async (
  report,
  locale,
  format,
) => {
  registerBundledFonts();
  const pdfBlob = await pdf(
    <ProductivityReportDocument report={report} locale={locale} />,
  ).toBlob();
  return format === "pdf" ? pdfBlob : rasterizeFirstPage(pdfBlob);
};

export function createReportDocument(
  report: WeeklyReportSnapshot,
  locale: ReportLocale,
) {
  registerBundledFonts();
  return <ProductivityReportDocument report={report} locale={locale} />;
}

function registerBundledFonts(): void {
  if (fontsRegistered) return;
  Font.register({
    family: "Noto Sans",
    fonts: [
      {
        src: new URL(
          "../assets/fonts/noto-sans-latin-400-normal.woff",
          import.meta.url,
        ).href,
        fontWeight: 400,
      },
      {
        src: new URL(
          "../assets/fonts/noto-sans-latin-700-normal.woff",
          import.meta.url,
        ).href,
        fontWeight: 700,
      },
    ],
  });
  fontsRegistered = true;
}

async function rasterizeFirstPage(pdfBlob: Blob): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const source = new Uint8Array(await pdfBlob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: source });
  const documentProxy = await loadingTask.promise;
  try {
    const page = await documentProxy.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("Canvas 2D is unavailable");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) reject(new Error("PNG encoding failed"));
        else resolve(blob);
      }, "image/png");
    });
  } finally {
    await loadingTask.destroy();
  }
}

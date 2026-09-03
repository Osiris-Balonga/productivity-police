import type { WeeklyReportSnapshot } from "@productivity-police/domain";

export type ReportLocale = "fr" | "en";

export interface ReportMetric {
  readonly key:
    | "distraction"
    | "allowance"
    | "daysWithinAllowance"
    | "warnings"
    | "blocks"
    | "overrides";
  readonly label: string;
  readonly value: number;
  readonly unit: "seconds" | "count";
}

export interface ReportTemplateModel {
  readonly title: string;
  readonly subtitle: string;
  readonly periodLabel: string;
  readonly metrics: readonly ReportMetric[];
  readonly siteBreakdownLabel: string;
  readonly overrideLabel: string;
  readonly siteBreakdown: WeeklyReportSnapshot["siteBreakdown"];
  readonly overrideEntries: WeeklyReportSnapshot["overrideEntries"];
  readonly universe: WeeklyReportSnapshot["universe"];
}

const COPY = {
  en: {
    studentTitle: "Weekly report card",
    proTitle: "Weekly performance review",
    studentSubtitle: "A clear look at your focus habits",
    proSubtitle: "A concise review of focus performance",
    period: "Reporting period",
    sites: "Distraction breakdown",
    overrides: "Documented overrides",
    labels: {
      distraction: "Distraction time",
      allowance: "Weekly allowance",
      daysWithinAllowance: "Days on target",
      warnings: "Warnings",
      blocks: "Blocks",
      overrides: "Overrides",
    },
  },
  fr: {
    studentTitle: "Bulletin hebdomadaire",
    proTitle: "Bilan de performance hebdomadaire",
    studentSubtitle: "Un regard clair sur tes habitudes de concentration",
    proSubtitle: "Une synthèse concise de ta performance de concentration",
    period: "Période du rapport",
    sites: "Répartition des distractions",
    overrides: "Dérogations documentées",
    labels: {
      distraction: "Temps de distraction",
      allowance: "Quota hebdomadaire",
      daysWithinAllowance: "Jours dans l'objectif",
      warnings: "Alertes",
      blocks: "Blocages",
      overrides: "Dérogations",
    },
  },
} as const;

export function createReportTemplateModel(
  report: WeeklyReportSnapshot,
  locale: ReportLocale,
): Readonly<ReportTemplateModel> {
  const copy = COPY[locale];
  const metrics: ReportMetric[] = [
    {
      key: "distraction",
      label: copy.labels.distraction,
      value: report.distractionSeconds,
      unit: "seconds",
    },
    {
      key: "allowance",
      label: copy.labels.allowance,
      value: report.allowanceSeconds,
      unit: "seconds",
    },
    {
      key: "daysWithinAllowance",
      label: copy.labels.daysWithinAllowance,
      value: report.daysWithinAllowance,
      unit: "count",
    },
    {
      key: "warnings",
      label: copy.labels.warnings,
      value: report.warningCount,
      unit: "count",
    },
    {
      key: "blocks",
      label: copy.labels.blocks,
      value: report.blockedCount,
      unit: "count",
    },
    {
      key: "overrides",
      label: copy.labels.overrides,
      value: report.overrideCount,
      unit: "count",
    },
  ];
  return Object.freeze({
    title: report.universe === "student" ? copy.studentTitle : copy.proTitle,
    subtitle:
      report.universe === "student" ? copy.studentSubtitle : copy.proSubtitle,
    periodLabel: copy.period,
    metrics: Object.freeze(metrics.map((metric) => Object.freeze(metric))),
    siteBreakdownLabel: copy.sites,
    overrideLabel: copy.overrides,
    siteBreakdown: report.siteBreakdown,
    overrideEntries: report.overrideEntries,
    universe: report.universe,
  });
}

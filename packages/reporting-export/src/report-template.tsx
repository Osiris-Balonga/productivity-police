import { Document, View } from "@react-pdf/renderer";
import type { WeeklyReportSnapshot } from "@productivity-police/domain";

import { resolveFormat } from "../docn/core/formats";
import { Heading } from "../docn/primitives/heading";
import { PageFrame } from "../docn/primitives/page-frame";
import { Row } from "../docn/primitives/row";
import { Stack } from "../docn/primitives/stack";
import { Text } from "../docn/primitives/text";
import { createPdfTheme } from "../docn/themes/themes";
import {
  createReportTemplateModel,
  type ReportLocale,
  type ReportMetric,
  type ReportTemplateModel,
} from "./report-model";

const resolvedA4 = resolveFormat("a4");
if (resolvedA4.kind !== "fixed")
  throw new Error("Productivity reports require A4");
const A4 = resolvedA4;

export function ProductivityReportDocument({
  report,
  locale,
}: {
  readonly report: WeeklyReportSnapshot;
  readonly locale: ReportLocale;
}) {
  const model = createReportTemplateModel(report, locale);
  const theme = createPdfTheme(
    model.universe === "student" ? "bold" : "neutral",
    {
      colors:
        model.universe === "student"
          ? { accent: "#6d4aff", canvas: "#f8f6ff", surface: "#ffffff" }
          : { accent: "#145c72", canvas: "#f3f7f8", surface: "#ffffff" },
    },
  );
  return (
    <Document title={model.title} language={locale}>
      <PageFrame format={A4} theme={theme}>
        <Stack gap="xl">
          <Stack gap="sm">
            <Text
              size="label"
              weight="strong"
              style={{ color: theme.colors.accent }}
            >
              PRODUCTIVITY POLICE
            </Text>
            <Heading level={1}>{model.title}</Heading>
            <Text tone="muted">{model.subtitle}</Text>
            <Text size="caption">
              {model.periodLabel}: {report.periodStart} - {report.periodEnd}
            </Text>
          </Stack>
          <Row style={{ flexWrap: "wrap", rowGap: 10 }}>
            {model.metrics.map((metric) => (
              <View
                key={metric.key}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: 6,
                  borderWidth: 1,
                  padding: 10,
                  width: "32%",
                }}
              >
                <Text size="caption" tone="muted">
                  {metric.label}
                </Text>
                <Text
                  weight="strong"
                  style={{ color: theme.colors.accent, fontSize: 18 }}
                >
                  {formatMetric(metric, locale)}
                </Text>
              </View>
            ))}
          </Row>
          <ReportDetails model={model} locale={locale} />
        </Stack>
      </PageFrame>
    </Document>
  );
}

function ReportDetails({
  model,
  locale,
}: {
  readonly model: ReportTemplateModel;
  readonly locale: ReportLocale;
}) {
  return (
    <Row gap="lg">
      <Stack gap="sm" style={{ width: "50%" }}>
        <Heading level={3}>{model.siteBreakdownLabel}</Heading>
        {model.siteBreakdown.map((entry) => (
          <Row key={entry.siteId} justify="between">
            <Text>{entry.siteId}</Text>
            <Text weight="strong">
              {formatDuration(entry.distractionSeconds, locale)}
            </Text>
          </Row>
        ))}
      </Stack>
      <Stack gap="sm" style={{ width: "50%" }}>
        <Heading level={3}>{model.overrideLabel}</Heading>
        {model.overrideEntries.map((entry) => (
          <Stack key={`${entry.occurredAt}-${entry.siteId}`} gap="xs">
            <Text weight="strong">{entry.siteId}</Text>
            <Text>{entry.justification}</Text>
            <Text size="caption" tone="muted">
              {entry.occurredAt}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Row>
  );
}

function formatMetric(metric: ReportMetric, locale: ReportLocale): string {
  return metric.unit === "seconds"
    ? formatDuration(metric.value, locale)
    : new Intl.NumberFormat(locale).format(metric.value);
}

function formatDuration(seconds: number, locale: ReportLocale): string {
  const minutes = Math.round(seconds / 60);
  return locale === "fr" ? `${String(minutes)} min` : `${String(minutes)} min`;
}

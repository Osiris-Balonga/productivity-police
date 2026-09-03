import {
  getSystemTimeZoneContext,
  type Universe,
} from "@productivity-police/domain";
import {
  translate,
  type CatalogKey,
  type SupportedLocale,
} from "@productivity-police/i18n";
import { getUniverseTheme } from "@productivity-police/ui";
import type { ActivityEvent } from "@productivity-police/storage";

import {
  DashboardController,
  type ActivityViewModel,
  type DashboardViewModel,
} from "./dashboard-controller";
import { settingsStyles } from "./settings-styles";

export async function mountDashboardSurface(
  root: HTMLElement,
  controller: DashboardController,
  route: "dashboard" | "activity",
): Promise<void> {
  try {
    if (route === "activity") {
      renderActivity(root, await controller.readActivity());
    } else {
      renderDashboard(root, await controller.readDashboard());
    }
  } catch {
    root.textContent = "Local dashboard data is unavailable.";
  }
}

function renderDashboard(root: HTMLElement, model: DashboardViewModel): void {
  const shell = createShell(model.locale, model.universe, "dashboard");
  const main = document.createElement("main");
  const heading = document.createElement("header");
  heading.className = "page-heading";
  heading.innerHTML = `<h1>${translate(model.locale, "dashboard.title")}</h1><p class="lede">${translate(model.locale, "dashboard.description")}</p><div class="status-line"><span class="status-chip">${translate(model.locale, scheduleKey(model.scheduleState))}</span></div>`;
  const layout = document.createElement("div");
  layout.className = "dashboard-layout";
  const quota = document.createElement("section");
  quota.className = "quota-panel";
  quota.innerHTML = `<div class="quota-copy"><span>${translate(model.locale, "dashboard.quotaUsed")}</span><strong>${String(Math.round(model.usagePercent))}%</strong></div><progress max="100" value="${String(model.usagePercent)}" aria-label="${translate(model.locale, "dashboard.quotaUsed")}"></progress><p>${translate(model.locale, "quota.remaining", { minutes: Math.ceil(model.remainingSeconds / 60) })}</p>`;
  const facts = document.createElement("div");
  facts.className = "facts";
  facts.innerHTML = `<div class="fact"><span>${translate(model.locale, "dashboard.used")}</span><strong>${formatMinutes(model.usedSeconds, model.locale)}</strong></div><div class="fact"><span>${translate(model.locale, "dashboard.remaining")}</span><strong>${formatMinutes(model.remainingSeconds, model.locale)}</strong></div><div class="fact"><span>${translate(model.locale, "dashboard.blacklisted")}</span><strong>${String(model.blacklistedSites)}</strong></div>`;
  layout.append(quota, facts);
  main.append(heading, layout, createRecentActivity(model));
  shell.append(main);
  root.replaceChildren(shell);
}

function renderActivity(root: HTMLElement, model: ActivityViewModel): void {
  const shell = createShell(model.locale, model.universe, "activity");
  const main = document.createElement("main");
  const heading = document.createElement("header");
  heading.className = "page-heading";
  heading.innerHTML = `<h1>${translate(model.locale, "activity.title")}</h1><p class="lede">${translate(model.locale, "activity.description")}</p>`;
  main.append(heading, createActivityList(model.events, model.locale));
  shell.append(main);
  root.replaceChildren(shell);
}

function createRecentActivity(model: DashboardViewModel): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("header");
  heading.className = "section-heading";
  heading.innerHTML = `<h2>${translate(model.locale, "dashboard.recentActivity")}</h2><a class="text-link" href="#activity">${translate(model.locale, "dashboard.viewActivity")}</a>`;
  section.append(
    heading,
    createActivityList(model.recentActivity, model.locale),
  );
  return section;
}

function createActivityList(
  events: readonly Readonly<ActivityEvent>[],
  locale: SupportedLocale,
): HTMLElement {
  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = translate(locale, "activity.empty");
    return empty;
  }
  const list = document.createElement("ol");
  list.className = "activity-list";
  for (const event of events) {
    const item = document.createElement("li");
    item.className = "activity-item";
    const time = document.createElement("time");
    time.dateTime = event.occurredAt;
    time.textContent = formatInstant(event.occurredAt, locale);
    const copy = document.createElement("div");
    const title = document.createElement("p");
    title.textContent = eventLabel(event.type, locale);
    copy.append(title);
    const justification = event.metadata?.justification;
    if (typeof justification === "string" && justification.length > 0) {
      const detail = document.createElement("p");
      detail.className = "activity-detail";
      detail.textContent = justification;
      copy.append(detail);
    }
    item.append(time, copy);
    list.append(item);
  }
  return list;
}

function createShell(
  locale: SupportedLocale,
  universe: Universe,
  route: "dashboard" | "activity",
): HTMLElement {
  document.documentElement.lang = locale;
  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.dataset.universe = universe;
  const theme = getUniverseTheme(universe);
  shell.style.setProperty("--font", theme.fontFamily);
  for (const [name, value] of Object.entries(theme.tokens)) {
    shell.style.setProperty(
      `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    );
  }
  shell.innerHTML = `<style>${settingsStyles}</style><header class="topbar"><span class="brand">Productivity Police</span><nav class="nav" aria-label="Primary"><a href="#dashboard"${route === "dashboard" ? ' aria-current="page"' : ""}>${translate(locale, "nav.dashboard")}</a><a href="#activity"${route === "activity" ? ' aria-current="page"' : ""}>${translate(locale, "nav.activity")}</a><a href="#integrations">${translate(locale, "nav.integrations")}</a><a href="#settings">${translate(locale, "nav.settings")}</a></nav></header>`;
  return shell;
}

function eventLabel(type: string, locale: SupportedLocale): string {
  const keys: Readonly<Record<string, CatalogKey>> = {
    DISTRACTION_STARTED: "activity.event.distractionStarted",
    DISTRACTION_STOPPED: "activity.event.distractionStopped",
    OVERRIDE_GRANTED: "activity.event.overrideGranted",
    WARNING_TRIGGERED: "activity.event.warningTriggered",
    WEBSITE_BLOCKED: "activity.event.websiteBlocked",
  };
  const key = keys[type];
  return key === undefined ? type.replaceAll("_", " ") : translate(locale, key);
}

function scheduleKey(state: DashboardViewModel["scheduleState"]): CatalogKey {
  return state === "ON_DUTY"
    ? "status.onDuty"
    : state === "BREAK"
      ? "status.break"
      : "status.offDuty";
}

function formatMinutes(seconds: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "short",
    maximumFractionDigits: 0,
  }).format(Math.ceil(seconds / 60));
}

function formatInstant(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getSystemTimeZoneContext().timeZone,
  }).format(new Date(value));
}

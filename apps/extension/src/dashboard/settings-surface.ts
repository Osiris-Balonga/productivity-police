import { WEEKDAYS, type WebsiteRule } from "@productivity-police/domain";
import { translate, type SupportedLocale } from "@productivity-police/i18n";
import { getUniverseTheme } from "@productivity-police/ui";

import {
  SettingsController,
  type SettingsSnapshot,
  type SettingsUpdate,
} from "./settings-controller";
import { settingsStyles } from "./settings-styles";

export async function mountSettingsSurface(
  root: HTMLElement,
  controller: SettingsController,
): Promise<void> {
  try {
    await render(root, controller, await controller.read());
  } catch {
    root.textContent = "Local settings are unavailable.";
  }
}

async function render(
  root: HTMLElement,
  controller: SettingsController,
  snapshot: Readonly<SettingsSnapshot>,
): Promise<void> {
  const { settings, websiteRules } = snapshot;
  const locale = settings.locale;
  document.documentElement.lang = locale;
  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.dataset.universe = settings.universe;
  applyTheme(shell, settings.universe);
  shell.innerHTML = `<style>${settingsStyles}</style>`;

  const topbar = document.createElement("header");
  topbar.className = "topbar";
  topbar.innerHTML = `<span class="brand">Productivity Police</span><nav class="nav" aria-label="Primary"><a href="#dashboard">${translate(locale, "nav.dashboard")}</a><a href="#activity">${translate(locale, "nav.activity")}</a><a href="#settings" aria-current="page">${translate(locale, "nav.settings")}</a></nav>`;

  const main = document.createElement("main");
  const heading = document.createElement("header");
  heading.className = "page-heading";
  heading.innerHTML = `<h1>${translate(locale, "settings.title")}</h1><p class="lede">${translate(locale, "settings.description")}</p>`;
  const form = document.createElement("form");
  form.append(
    createPreferences(snapshot),
    createSchedule(snapshot),
    createSites(snapshot),
  );
  const actions = document.createElement("div");
  actions.className = "actions";
  const save = button(translate(locale, "settings.save"), "primary");
  save.type = "submit";
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("role", "status");
  actions.append(save, feedback);
  form.append(actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save.disabled = true;
    void controller
      .apply(readUpdate(form, websiteRules))
      .then((updated) => render(root, controller, updated))
      .catch(() => {
        save.disabled = false;
        feedback.dataset.error = "true";
        feedback.textContent = translate(locale, "settings.invalid");
      });
  });
  main.append(heading, form);
  shell.append(topbar, main);
  root.replaceChildren(shell);
  await Promise.resolve();
}

function createPreferences(snapshot: Readonly<SettingsSnapshot>): HTMLElement {
  const { settings } = snapshot;
  const fieldset = document.createElement("fieldset");
  fieldset.innerHTML = `<legend>${translate(settings.locale, "settings.preferences")}</legend><div class="field-grid"><label>${translate(settings.locale, "settings.locale")}<select name="locale"><option value="fr"${settings.locale === "fr" ? " selected" : ""}>Français</option><option value="en"${settings.locale === "en" ? " selected" : ""}>English</option></select></label><label>${translate(settings.locale, "settings.universe")}<select name="universe"><option value="student"${settings.universe === "student" ? " selected" : ""}>Student</option><option value="pro"${settings.universe === "pro" ? " selected" : ""}>Pro</option></select></label><label>${translate(settings.locale, "settings.allowance")}<input name="allowance" type="number" min="0" step="1" required value="${String(settings.dailyAllowanceMinutes)}"></label></div>`;
  return fieldset;
}

function createSchedule(snapshot: Readonly<SettingsSnapshot>): HTMLElement {
  const fieldset = document.createElement("fieldset");
  fieldset.innerHTML = `<legend>${translate(snapshot.settings.locale, "settings.schedule")}</legend>`;
  for (const weekday of WEEKDAYS) {
    const day = snapshot.settings.schedule.days.find(
      (candidate) => candidate.weekday === weekday,
    );
    const row = document.createElement("div");
    row.className = "day-row";
    row.dataset.weekday = weekday;
    row.innerHTML = `<label class="day-toggle"><input type="checkbox" data-day-enabled${day?.enabled === true ? " checked" : ""}>${translate(snapshot.settings.locale, `weekday.${weekday}`)}</label>`;
    const periods = document.createElement("div");
    periods.className = "periods";
    for (const period of day?.periods.length === 0 || day === undefined
      ? [{ start: "09:00", end: "17:00" }]
      : day.periods) {
      periods.append(
        createPeriodRow(snapshot.settings.locale, period.start, period.end),
      );
    }
    const addPeriod = button(
      translate(snapshot.settings.locale, "settings.addPeriod"),
      "secondary",
    );
    addPeriod.addEventListener("click", () => {
      periods.insertBefore(
        createPeriodRow(snapshot.settings.locale, "09:00", "17:00"),
        addPeriod,
      );
    });
    periods.append(addPeriod);
    row.append(periods);
    fieldset.append(row);
  }
  return fieldset;
}

function createSites(snapshot: Readonly<SettingsSnapshot>): HTMLElement {
  const fieldset = document.createElement("fieldset");
  fieldset.innerHTML = `<legend>${translate(snapshot.settings.locale, "settings.sites")}</legend>`;
  const rows = document.createElement("div");
  rows.dataset.siteRows = "true";
  for (const rule of snapshot.websiteRules) {
    rows.append(createSiteRow(snapshot.settings.locale, rule));
  }
  const add = button(
    translate(snapshot.settings.locale, "settings.addSite"),
    "secondary",
  );
  add.addEventListener("click", () => {
    rows.append(createSiteRow(snapshot.settings.locale));
  });
  fieldset.append(rows, add);
  return fieldset;
}

function createPeriodRow(
  locale: SupportedLocale,
  start: string,
  end: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "period-row";
  row.innerHTML = `<label>${translate(locale, "settings.start")}<input type="time" data-period-start value="${start}"></label><label>${translate(locale, "settings.end")}<input type="time" data-period-end value="${end}"></label>`;
  const remove = button(translate(locale, "settings.remove"), "remove");
  remove.addEventListener("click", () => {
    row.remove();
  });
  row.append(remove);
  return row;
}

function createSiteRow(
  locale: SupportedLocale,
  rule?: Readonly<WebsiteRule>,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "site-row";
  row.dataset.ruleId = rule?.id ?? crypto.randomUUID();
  row.dataset.createdAt = rule?.createdAt ?? new Date().toISOString();
  row.innerHTML = `<label>${translate(locale, "settings.siteName")}<input data-site-name value="${escapeAttribute(rule?.name ?? "")}" required></label><label>${translate(locale, "settings.domain")}<input data-site-domain value="${escapeAttribute(rule?.domain ?? "")}" required></label><label>${translate(locale, "settings.list")}<select data-site-list><option value="blacklist"${rule?.list === "blacklist" ? " selected" : ""}>Blacklist</option><option value="whitelist"${rule?.list === "whitelist" ? " selected" : ""}>Whitelist</option></select></label>`;
  const remove = button(translate(locale, "settings.remove"), "remove");
  remove.addEventListener("click", () => {
    row.remove();
  });
  row.append(remove);
  return row;
}

function readUpdate(
  form: HTMLFormElement,
  previousRules: readonly Readonly<WebsiteRule>[],
): SettingsUpdate {
  const values = new FormData(form);
  const locale = values.get("locale") === "fr" ? "fr" : "en";
  const universe = values.get("universe") === "pro" ? "pro" : "student";
  const schedule = {
    days: WEEKDAYS.map((weekday) => {
      const row = form.querySelector<HTMLElement>(
        `.day-row[data-weekday="${weekday}"]`,
      );
      const enabled =
        row !== null &&
        row.querySelector<HTMLInputElement>("[data-day-enabled]")?.checked ===
          true;
      const periodRows =
        row === null
          ? []
          : Array.from(row.querySelectorAll<HTMLElement>(".period-row"));
      const periods = enabled
        ? periodRows.map((period) => ({
            start:
              period.querySelector<HTMLInputElement>("[data-period-start]")
                ?.value ?? "",
            end:
              period.querySelector<HTMLInputElement>("[data-period-end]")
                ?.value ?? "",
          }))
        : [];
      return { weekday, enabled, periods };
    }),
  };
  const prior = new Map(previousRules.map((rule) => [rule.id, rule]));
  const websiteRules = Array.from(
    form.querySelectorAll<HTMLElement>(".site-row"),
  ).map((row) => {
    const id = row.dataset.ruleId ?? crypto.randomUUID();
    return {
      id,
      name:
        row.querySelector<HTMLInputElement>("[data-site-name]")?.value ?? "",
      domain:
        row.querySelector<HTMLInputElement>("[data-site-domain]")?.value ?? "",
      list:
        row.querySelector<HTMLSelectElement>("[data-site-list]")?.value ===
        "whitelist"
          ? ("whitelist" as const)
          : ("blacklist" as const),
      createdAt:
        prior.get(id)?.createdAt ??
        row.dataset.createdAt ??
        new Date().toISOString(),
    };
  });
  return {
    locale,
    universe,
    dailyAllowanceMinutes: Number(values.get("allowance")),
    schedule,
    websiteRules,
  };
}

function applyTheme(element: HTMLElement, universe: "student" | "pro"): void {
  const theme = getUniverseTheme(universe);
  element.style.setProperty("--font", theme.fontFamily);
  for (const [name, value] of Object.entries(theme.tokens)) {
    element.style.setProperty(`--${toKebabCase(name)}`, value);
  }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

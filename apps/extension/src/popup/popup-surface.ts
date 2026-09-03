import type { ScheduleState } from "@productivity-police/domain";
import { translate, type CatalogKey } from "@productivity-police/i18n";
import { getUniverseTheme } from "@productivity-police/ui";

import type { PopupController, PopupViewModel } from "./popup-controller";

export async function mountPopupSurface(
  root: HTMLElement,
  controller: PopupController,
  openDashboard: () => Promise<void>,
): Promise<void> {
  try {
    renderPopup(root, await controller.read(), openDashboard);
  } catch {
    root.textContent = "Local popup data is unavailable.";
  }
}

function renderPopup(
  root: HTMLElement,
  model: Readonly<PopupViewModel>,
  openDashboard: () => Promise<void>,
): void {
  document.documentElement.lang = model.locale;
  const theme = getUniverseTheme(model.universe);
  const shell = document.createElement("main");
  shell.className = "popup-shell";
  shell.dataset.universe = model.universe;
  shell.style.setProperty("--font", theme.fontFamily);
  for (const [name, value] of Object.entries(theme.tokens)) {
    shell.style.setProperty(
      `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    );
  }

  const style = document.createElement("style");
  style.textContent = styles;
  const header = document.createElement("header");
  header.className = "identity";
  const mark = document.createElement("span");
  mark.className = "mascot-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = model.universe === "student" ? "P" : "M";
  const identityCopy = document.createElement("div");
  const brand = document.createElement("strong");
  brand.textContent = "Productivity Police";
  const persona = document.createElement("span");
  persona.textContent = translate(
    model.locale,
    model.universe === "student" ? "popup.mascotStudent" : "popup.mascotPro",
  );
  identityCopy.append(brand, persona);
  header.append(mark, identityCopy);

  const status = document.createElement("section");
  status.className = "status";
  const statusLabel = document.createElement("span");
  statusLabel.textContent = translate(model.locale, "popup.status");
  const statusValue = document.createElement("strong");
  statusValue.textContent = translate(
    model.locale,
    scheduleKey(model.scheduleState),
  );
  status.append(statusLabel, statusValue);

  const quota = document.createElement("section");
  quota.className = "quota";
  const quotaCopy = document.createElement("div");
  const quotaLabel = document.createElement("span");
  quotaLabel.textContent = translate(model.locale, "popup.quotaUsed");
  const percent = document.createElement("strong");
  percent.textContent = `${String(Math.round(model.usagePercent))}%`;
  quotaCopy.append(quotaLabel, percent);
  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = model.usagePercent;
  progress.setAttribute(
    "aria-label",
    translate(model.locale, "popup.quotaUsed"),
  );
  const remaining = document.createElement("p");
  remaining.textContent = translate(model.locale, "quota.remaining", {
    minutes: Math.ceil(model.remainingSeconds / 60),
  });
  quota.append(quotaCopy, progress, remaining);

  const dashboard = document.createElement("button");
  dashboard.type = "button";
  dashboard.textContent = translate(model.locale, "popup.openDashboard");
  dashboard.addEventListener("click", () => void openDashboard());

  shell.append(header, status, quota, dashboard);
  root.replaceChildren(style, shell);
}

function scheduleKey(state: ScheduleState): CatalogKey {
  return state === "ON_DUTY"
    ? "status.onDuty"
    : state === "BREAK"
      ? "status.break"
      : "status.offDuty";
}

const styles = `
  :root { color-scheme: light; font-synthesis: none; -webkit-font-smoothing: antialiased; }
  * { box-sizing: border-box; }
  body { margin: 0; min-width: 340px; }
  button { font: inherit; }
  .popup-shell { background: var(--background); color: var(--ink); display: flex; flex-direction: column; font-family: var(--font); gap: 20px; min-height: 390px; padding: 24px; }
  .identity { align-items: center; display: flex; gap: 12px; }
  .identity div { display: flex; flex-direction: column; gap: 2px; }
  .identity strong { letter-spacing: -.02em; }
  .identity span { color: var(--muted); font-size: .8rem; }
  .mascot-mark { align-items: center; background: var(--accent); border-radius: 10px; color: var(--accent-contrast) !important; display: flex; font-size: 1rem !important; font-weight: 800; height: 38px; justify-content: center; width: 38px; }
  .status { border-block: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; padding: 20px 0; }
  .status span, .quota span { color: var(--muted); font-size: .78rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .status strong { font-size: 2rem; letter-spacing: -.035em; line-height: 1.05; }
  .quota { background: var(--surface); border-radius: 12px; padding: 18px; }
  .quota div { align-items: baseline; display: flex; justify-content: space-between; }
  .quota strong { font-size: 1.35rem; font-variant-numeric: tabular-nums; }
  .quota progress { accent-color: var(--accent); height: 8px; margin: 16px 0 8px; width: 100%; }
  .quota p { color: var(--muted); font-size: .85rem; margin: 0; }
  button { background: var(--accent); border: 0; border-radius: 8px; color: var(--accent-contrast); cursor: pointer; font-weight: 750; min-height: 44px; padding: 11px 16px; transition: transform 120ms cubic-bezier(.2,0,0,1), filter 120ms cubic-bezier(.2,0,0,1); }
  button:hover { filter: brightness(.92); }
  button:active { transform: scale(.97); }
  button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  [data-universe=student] .quota { border: 1px solid var(--ink); box-shadow: 0 2px 0 var(--ink); }
  [data-universe=student] .mascot-mark { border-radius: 50%; }
  @media (prefers-reduced-motion: reduce) { button { transition-duration: 0ms; } }
`;

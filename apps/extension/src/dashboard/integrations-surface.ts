import { translate } from "@productivity-police/i18n";
import { getUniverseTheme } from "@productivity-police/ui";

import { IntegrationsController } from "./integrations-controller";
import { settingsStyles } from "./settings-styles";

export async function mountIntegrationsSurface(
  root: HTMLElement,
  controller: IntegrationsController,
): Promise<void> {
  try {
    const snapshot = await controller.read();
    const { locale, universe } = snapshot.settings;
    document.documentElement.lang = locale;
    const shell = document.createElement("div");
    shell.className = "app-shell";
    shell.dataset.universe = universe;
    applyTheme(shell, universe);
    shell.innerHTML = `<style>${settingsStyles}</style>`;

    const topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML = `<span class="brand">Productivity Police</span><nav class="nav" aria-label="Primary"><a href="#dashboard">${translate(locale, "nav.dashboard")}</a><a href="#activity">${translate(locale, "nav.activity")}</a><a href="#integrations" aria-current="page">${translate(locale, "nav.integrations")}</a><a href="#settings">${translate(locale, "nav.settings")}</a></nav>`;

    const main = document.createElement("main");
    const heading = document.createElement("header");
    heading.className = "page-heading";
    heading.innerHTML = `<h1>${translate(locale, "integrations.title")}</h1><p class="lede">${translate(locale, "integrations.description")}</p>`;
    const action = document.createElement("section");
    action.className = "integration-action";
    const copy = document.createElement("div");
    copy.innerHTML = `<h2>${translate(locale, "integrations.syncTitle")}</h2><p>${translate(locale, "integrations.syncDescription")}</p>`;
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "primary";
    refresh.textContent = translate(locale, "integrations.refresh");
    const feedback = document.createElement("p");
    feedback.className = "feedback";
    feedback.setAttribute("role", "status");
    refresh.addEventListener("click", () => {
      refresh.disabled = true;
      refresh.setAttribute("aria-busy", "true");
      refresh.textContent = translate(locale, "integrations.refreshing");
      feedback.textContent = "";
      void controller
        .refresh()
        .then(() => {
          feedback.textContent = translate(locale, "integrations.complete");
        })
        .catch(() => {
          feedback.dataset.error = "true";
          feedback.textContent = translate(locale, "integrations.failed");
        })
        .finally(() => {
          refresh.disabled = false;
          refresh.removeAttribute("aria-busy");
          refresh.textContent = translate(locale, "integrations.refresh");
        });
    });
    action.append(copy, refresh, feedback);
    main.append(heading, action);
    shell.append(topbar, main);
    root.replaceChildren(shell);
  } catch {
    root.textContent = "Local integrations are unavailable.";
  }
}

function applyTheme(element: HTMLElement, universe: "student" | "pro"): void {
  const theme = getUniverseTheme(universe);
  element.style.setProperty("--font", theme.fontFamily);
  for (const [name, value] of Object.entries(theme.tokens)) {
    element.style.setProperty(
      `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    );
  }
}

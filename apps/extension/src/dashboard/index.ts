import {
  ChromeStorageArea,
  VersionedStorageRepository,
} from "@productivity-police/storage";
import { getSystemTimeZoneContext } from "@productivity-police/domain";

import { DashboardController } from "./dashboard-controller";
import { mountDashboardSurface } from "./dashboard-surface";
import { SettingsController } from "./settings-controller";
import { mountSettingsSurface } from "./settings-surface";
import { IntegrationsController } from "./integrations-controller";
import { mountIntegrationsSurface } from "./integrations-surface";

const root = document.querySelector<HTMLElement>("#app");
if (root !== null) {
  const storage = new VersionedStorageRepository(
    new ChromeStorageArea(chrome.storage.local),
  );
  const settingsController = new SettingsController(storage);
  const dashboardController = new DashboardController(storage, {
    now: () => new Date(),
    timeZone: getSystemTimeZoneContext(),
  });
  const integrationsController = new IntegrationsController(settingsController);

  const render = (): void => {
    if (location.hash === "#settings") {
      void mountSettingsSurface(root, settingsController);
      return;
    }
    if (location.hash === "#integrations") {
      void mountIntegrationsSurface(root, integrationsController);
      return;
    }
    void mountDashboardSurface(
      root,
      dashboardController,
      location.hash === "#activity" ? "activity" : "dashboard",
    );
  };

  window.addEventListener("hashchange", render);
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === "local") {
      render();
    }
  });
  render();
}

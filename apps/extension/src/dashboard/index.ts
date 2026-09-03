import {
  ChromeStorageArea,
  VersionedStorageRepository,
} from "@productivity-police/storage";
import { getSystemTimeZoneContext } from "@productivity-police/domain";

import { DashboardController } from "./dashboard-controller";
import { mountDashboardSurface } from "./dashboard-surface";
import { SettingsController } from "./settings-controller";
import { mountSettingsSurface } from "./settings-surface";

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

  const render = (): void => {
    if (location.hash === "#settings") {
      void mountSettingsSurface(root, settingsController);
      return;
    }
    void mountDashboardSurface(
      root,
      dashboardController,
      location.hash === "#activity" ? "activity" : "dashboard",
    );
  };

  window.addEventListener("hashchange", render);
  render();
}

import {
  ChromeStorageArea,
  VersionedStorageRepository,
} from "@productivity-police/storage";

import { SettingsController } from "./settings-controller";
import { mountSettingsSurface } from "./settings-surface";

const root = document.querySelector<HTMLElement>("#app");
if (root !== null) {
  const controller = new SettingsController(
    new VersionedStorageRepository(new ChromeStorageArea(chrome.storage.local)),
  );
  void mountSettingsSurface(root, controller);
}

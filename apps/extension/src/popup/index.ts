import { getSystemTimeZoneContext } from "@productivity-police/domain";
import {
  ChromeStorageArea,
  VersionedStorageRepository,
} from "@productivity-police/storage";

import { PopupController } from "./popup-controller";
import { mountPopupSurface } from "./popup-surface";

const root = document.querySelector<HTMLElement>("#app");
if (root !== null) {
  const controller = new PopupController(
    new VersionedStorageRepository(new ChromeStorageArea(chrome.storage.local)),
    { now: () => new Date(), timeZone: getSystemTimeZoneContext() },
  );
  const render = (): void => {
    void mountPopupSurface(root, controller, () =>
      chrome.runtime.openOptionsPage(),
    );
  };
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === "local") {
      render();
    }
  });
  render();
}

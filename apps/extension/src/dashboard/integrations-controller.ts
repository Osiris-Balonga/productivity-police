import type { SettingsSnapshot } from "./settings-controller";
import { SettingsController } from "./settings-controller";
import {
  REFRESH_PROVIDERS_MESSAGE,
  type RefreshProvidersResponse,
} from "../provider-refresh-message";

export class IntegrationsController {
  readonly #settings: SettingsController;

  constructor(settings: SettingsController) {
    this.#settings = settings;
  }

  read(): Promise<Readonly<SettingsSnapshot>> {
    return this.#settings.read();
  }

  async refresh(): Promise<void> {
    const response: unknown = await chrome.runtime.sendMessage({
      type: REFRESH_PROVIDERS_MESSAGE,
    });
    if (
      typeof response !== "object" ||
      response === null ||
      !(response as RefreshProvidersResponse).refreshed
    ) {
      throw new Error("Provider refresh failed");
    }
  }
}

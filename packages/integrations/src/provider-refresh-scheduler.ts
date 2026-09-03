export const PROVIDER_REFRESH_ALARM = "provider-refresh";
export const PROVIDER_REFRESH_PERIOD_MINUTES = 5;

export interface ProviderAlarm {
  readonly name: string;
}

export interface ProviderAlarmPort {
  create(name: string, periodInMinutes: number): Promise<void>;
  onAlarm(listener: (alarm: ProviderAlarm) => void): void;
}

export type RefreshProviders = () => Promise<void>;

export class ProviderRefreshScheduler {
  readonly #alarms: ProviderAlarmPort;
  readonly #refresh: RefreshProviders;
  #pending: Promise<void> = Promise.resolve();

  constructor(alarms: ProviderAlarmPort, refresh: RefreshProviders) {
    this.#alarms = alarms;
    this.#refresh = refresh;
  }

  async start(): Promise<void> {
    this.#alarms.onAlarm((alarm) => {
      if (alarm.name === PROVIDER_REFRESH_ALARM) {
        void this.refreshNow();
      }
    });
    await this.#alarms.create(
      PROVIDER_REFRESH_ALARM,
      PROVIDER_REFRESH_PERIOD_MINUTES,
    );
  }

  refreshNow(): Promise<void> {
    const refresh = this.#pending.then(this.#refresh);
    this.#pending = refresh.catch(() => undefined);
    return refresh;
  }

  whenIdle(): Promise<void> {
    return this.#pending;
  }
}

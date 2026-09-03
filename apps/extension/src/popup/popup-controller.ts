import {
  evaluateWorkScheduleAt,
  toLocalDate,
  type ScheduleState,
  type TimeZoneContext,
  type Universe,
} from "@productivity-police/domain";
import {
  DailyUsageRepository,
  type StorageRepository,
} from "@productivity-police/storage";

import { SettingsController } from "../dashboard/settings-controller";

export interface PopupViewModel {
  readonly locale: "fr" | "en";
  readonly universe: Universe;
  readonly scheduleState: ScheduleState;
  readonly usedSeconds: number;
  readonly remainingSeconds: number;
  readonly usagePercent: number;
}

export interface PopupClock {
  readonly now: () => Date;
  readonly timeZone: TimeZoneContext;
}

export class PopupController {
  readonly #settings: SettingsController;
  readonly #usage: DailyUsageRepository;
  readonly #clock: PopupClock;

  constructor(storage: StorageRepository, clock: PopupClock) {
    this.#settings = new SettingsController(storage);
    this.#usage = new DailyUsageRepository(storage);
    this.#clock = clock;
  }

  async read(): Promise<Readonly<PopupViewModel>> {
    const now = this.#clock.now();
    const [snapshot, usage] = await Promise.all([
      this.#settings.read(),
      this.#usage.read(toLocalDate(now, this.#clock.timeZone)),
    ]);
    const allowanceSeconds = snapshot.settings.dailyAllowanceMinutes * 60;
    return Object.freeze({
      locale: snapshot.settings.locale,
      universe: snapshot.settings.universe,
      scheduleState: evaluateWorkScheduleAt(
        snapshot.settings.schedule,
        now,
        this.#clock.timeZone,
      ),
      usedSeconds: usage.usedSeconds,
      remainingSeconds: Math.max(0, allowanceSeconds - usage.usedSeconds),
      usagePercent:
        allowanceSeconds === 0
          ? 100
          : Math.min(100, (usage.usedSeconds / allowanceSeconds) * 100),
    });
  }
}

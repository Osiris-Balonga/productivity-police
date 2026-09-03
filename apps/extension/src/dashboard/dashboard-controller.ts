import {
  evaluateWorkScheduleAt,
  toLocalDate,
  type ScheduleState,
  type TimeZoneContext,
  type Universe,
} from "@productivity-police/domain";
import {
  ActivityRepository,
  DailyUsageRepository,
  type ActivityEvent,
  type StorageRepository,
} from "@productivity-police/storage";

import { SettingsController } from "./settings-controller";

export interface DashboardViewModel {
  readonly locale: "fr" | "en";
  readonly universe: Universe;
  readonly scheduleState: ScheduleState;
  readonly usedSeconds: number;
  readonly allowanceSeconds: number;
  readonly remainingSeconds: number;
  readonly usagePercent: number;
  readonly blacklistedSites: number;
  readonly recentActivity: readonly Readonly<ActivityEvent>[];
}

export interface ActivityViewModel {
  readonly locale: "fr" | "en";
  readonly universe: Universe;
  readonly events: readonly Readonly<ActivityEvent>[];
}

export interface DashboardClock {
  readonly now: () => Date;
  readonly timeZone: TimeZoneContext;
}

export class DashboardController {
  readonly #settings: SettingsController;
  readonly #usage: DailyUsageRepository;
  readonly #activity: ActivityRepository;
  readonly #clock: DashboardClock;

  constructor(storage: StorageRepository, clock: DashboardClock) {
    this.#settings = new SettingsController(storage);
    this.#usage = new DailyUsageRepository(storage);
    this.#activity = new ActivityRepository(storage);
    this.#clock = clock;
  }

  async readDashboard(): Promise<Readonly<DashboardViewModel>> {
    const now = this.#clock.now();
    const [snapshot, usage, activity] = await Promise.all([
      this.#settings.read(),
      this.#usage.read(toLocalDate(now, this.#clock.timeZone)),
      this.#activity.list(),
    ]);
    const allowanceSeconds = snapshot.settings.dailyAllowanceMinutes * 60;
    const remainingSeconds = Math.max(0, allowanceSeconds - usage.usedSeconds);
    const usagePercent =
      allowanceSeconds === 0
        ? 100
        : Math.min(100, (usage.usedSeconds / allowanceSeconds) * 100);
    return Object.freeze({
      locale: snapshot.settings.locale,
      universe: snapshot.settings.universe,
      scheduleState: evaluateWorkScheduleAt(
        snapshot.settings.schedule,
        now,
        this.#clock.timeZone,
      ),
      usedSeconds: usage.usedSeconds,
      allowanceSeconds,
      remainingSeconds,
      usagePercent,
      blacklistedSites: snapshot.websiteRules.filter(
        (rule) => rule.list === "blacklist",
      ).length,
      recentActivity: Object.freeze(activity.slice(0, 5)),
    });
  }

  async readActivity(): Promise<Readonly<ActivityViewModel>> {
    const [snapshot, events] = await Promise.all([
      this.#settings.read(),
      this.#activity.list(),
    ]);
    return Object.freeze({
      locale: snapshot.settings.locale,
      universe: snapshot.settings.universe,
      events: Object.freeze(events),
    });
  }
}

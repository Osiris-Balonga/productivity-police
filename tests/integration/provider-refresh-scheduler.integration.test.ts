import { describe, expect, it } from "vitest";

import {
  PROVIDER_REFRESH_ALARM,
  ProviderRefreshScheduler,
  type ProviderAlarm,
  type ProviderAlarmPort,
} from "../../packages/integrations/src";

describe("provider refresh scheduler", () => {
  it("INT-09 triggers a provider refresh every five minutes", async () => {
    let listener: ((alarm: ProviderAlarm) => void) | undefined;
    const schedules: { name: string; periodInMinutes: number }[] = [];
    const alarms: ProviderAlarmPort = {
      create: (name, periodInMinutes) => {
        schedules.push({ name, periodInMinutes });
        return Promise.resolve();
      },
      onAlarm: (callback) => {
        listener = callback;
      },
    };
    let refreshes = 0;
    const scheduler = new ProviderRefreshScheduler(alarms, () => {
      refreshes += 1;
      return Promise.resolve();
    });

    await scheduler.start();
    expect(schedules).toEqual([
      { name: PROVIDER_REFRESH_ALARM, periodInMinutes: 5 },
    ]);

    listener?.({ name: PROVIDER_REFRESH_ALARM });
    await scheduler.whenIdle();
    expect(refreshes).toBe(1);
  });
});

import { describe, expect, it, vi } from "vitest";

import { RetentionCleanupScheduler } from "./retention-scheduler";

describe("retention cleanup scheduler", () => {
  it("RET-06 runs on startup and once for each daily maintenance alarm", async () => {
    let alarmListener: ((alarm: { name: string }) => void) | undefined;
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const scheduler = new RetentionCleanupScheduler(
      {
        create: vi.fn().mockResolvedValue(undefined),
        onAlarm: (listener) => {
          alarmListener = listener;
        },
      },
      cleanup,
    );

    await scheduler.start();
    alarmListener?.({ name: "unrelated" });
    alarmListener?.({ name: RetentionCleanupScheduler.ALARM_NAME });
    await scheduler.whenIdle();

    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

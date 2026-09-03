export interface RetentionAlarmPort {
  create(name: string, periodInMinutes: number): Promise<void>;
  onAlarm(listener: (alarm: { name: string }) => void): void;
}

export class RetentionCleanupScheduler {
  static readonly ALARM_NAME = "retention-maintenance";
  static readonly PERIOD_MINUTES = 24 * 60;

  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly alarms: RetentionAlarmPort,
    private readonly cleanup: () => Promise<unknown>,
  ) {}

  async start(): Promise<void> {
    this.alarms.onAlarm((alarm) => {
      if (alarm.name === RetentionCleanupScheduler.ALARM_NAME) this.runNow();
    });
    await this.alarms.create(
      RetentionCleanupScheduler.ALARM_NAME,
      RetentionCleanupScheduler.PERIOD_MINUTES,
    );
    this.runNow();
    await this.whenIdle();
  }

  whenIdle(): Promise<void> {
    return this.pending;
  }

  private runNow(): void {
    this.pending = this.pending
      .then(() => this.cleanup())
      .then(() => undefined)
      .catch(() => undefined);
  }
}

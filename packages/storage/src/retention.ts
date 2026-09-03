import type { ActivityEvent } from "./activity";
import type { StorageRepository } from "./repository";

export const ACTIVITY_RETENTION_DAYS = 90;

export async function purgeExpiredActivity(
  storage: StorageRepository,
  now: Date,
  retentionDays = ACTIVITY_RETENTION_DAYS,
): Promise<number> {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isSafeInteger(retentionDays) ||
    retentionDays < 0
  ) {
    throw new RangeError("A valid retention period is required");
  }
  const envelope = await storage.read();
  if (envelope?.activity === undefined) return 0;
  if (!Array.isArray(envelope.activity))
    throw new TypeError("Stored activity is invalid");
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const retained = envelope.activity.filter((value) => {
    const event = value as Partial<ActivityEvent>;
    const occurredAt = new Date(event.occurredAt ?? "").getTime();
    if (!Number.isFinite(occurredAt))
      throw new TypeError("Stored activity is invalid");
    return occurredAt >= cutoff;
  });
  const removed = envelope.activity.length - retained.length;
  if (removed > 0) await storage.write({ ...envelope, activity: retained });
  return removed;
}

export async function deleteActivityHistory(
  storage: StorageRepository,
): Promise<void> {
  const envelope = await storage.read();
  if (envelope !== undefined)
    await storage.write({ ...envelope, activity: [] });
}

export function resetAllData(storage: StorageRepository): Promise<void> {
  return storage.clear();
}

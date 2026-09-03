import type { StorageEnvelope } from "./model";
import type { StorageRepository } from "./repository";

export interface DailyUsage {
  localDate: string;
  usedSeconds: number;
  bySiteSeconds: Readonly<Record<string, number>>;
  warningTriggered: boolean;
  exhaustedTriggered: boolean;
}

export class InvalidDailyUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDailyUsageError";
  }
}

export class MissingStorageEnvelopeError extends Error {
  constructor() {
    super("A versioned storage envelope is required");
    this.name = "MissingStorageEnvelopeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertLocalDate(localDate: string): void {
  const parsed = new Date(`${localDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(localDate) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== localDate
  ) {
    throw new InvalidDailyUsageError("A valid ISO local date is required");
  }
}

function createEmptyUsage(localDate: string): DailyUsage {
  return {
    localDate,
    usedSeconds: 0,
    bySiteSeconds: {},
    warningTriggered: false,
    exhaustedTriggered: false,
  };
}

function parseUsage(value: unknown, localDate: string): DailyUsage {
  if (!isRecord(value) || !isRecord(value.bySiteSeconds)) {
    throw new InvalidDailyUsageError(`Invalid usage for ${localDate}`);
  }

  const siteEntries = Object.entries(value.bySiteSeconds);
  const validSiteEntries = siteEntries.every(
    ([siteId, seconds]) =>
      siteId.length > 0 &&
      typeof seconds === "number" &&
      Number.isFinite(seconds) &&
      seconds >= 0,
  );

  if (
    value.localDate !== localDate ||
    typeof value.usedSeconds !== "number" ||
    !Number.isFinite(value.usedSeconds) ||
    value.usedSeconds < 0 ||
    typeof value.warningTriggered !== "boolean" ||
    typeof value.exhaustedTriggered !== "boolean" ||
    !validSiteEntries
  ) {
    throw new InvalidDailyUsageError(`Invalid usage for ${localDate}`);
  }

  return structuredClone(value) as unknown as DailyUsage;
}

function readUsageByDate(envelope: StorageEnvelope): Record<string, unknown> {
  if (envelope.usageByDate === undefined) {
    return {};
  }
  if (!isRecord(envelope.usageByDate)) {
    throw new InvalidDailyUsageError("Invalid usageByDate section");
  }
  return envelope.usageByDate;
}

export class DailyUsageRepository {
  readonly #storage: StorageRepository;

  constructor(storage: StorageRepository) {
    this.#storage = storage;
  }

  async read(localDate: string): Promise<DailyUsage> {
    assertLocalDate(localDate);
    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new MissingStorageEnvelopeError();
    }

    const storedUsage = readUsageByDate(envelope)[localDate];
    return storedUsage === undefined
      ? createEmptyUsage(localDate)
      : parseUsage(storedUsage, localDate);
  }

  async add(
    localDate: string,
    siteId: string,
    seconds: number,
  ): Promise<DailyUsage> {
    assertLocalDate(localDate);
    if (siteId.length === 0 || !Number.isFinite(seconds) || seconds < 0) {
      throw new InvalidDailyUsageError("Valid site usage is required");
    }

    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new MissingStorageEnvelopeError();
    }

    const usageByDate = readUsageByDate(envelope);
    const current =
      usageByDate[localDate] === undefined
        ? createEmptyUsage(localDate)
        : parseUsage(usageByDate[localDate], localDate);
    const updated: DailyUsage = {
      ...current,
      usedSeconds: current.usedSeconds + seconds,
      bySiteSeconds: {
        ...current.bySiteSeconds,
        [siteId]: (current.bySiteSeconds[siteId] ?? 0) + seconds,
      },
    };

    await this.#storage.write({
      ...envelope,
      usageByDate: { ...usageByDate, [localDate]: updated },
    });
    return structuredClone(updated);
  }
}

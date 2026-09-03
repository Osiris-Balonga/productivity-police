import type { StorageRepository } from "./repository";

export interface ActivityEvent {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly siteId?: string;
  readonly tabId?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class InvalidActivityError extends Error {
  constructor() {
    super("Stored Activity is invalid");
    this.name = "InvalidActivityError";
  }
}

export class ActivityRepository {
  readonly #storage: StorageRepository;

  constructor(storage: StorageRepository) {
    this.#storage = storage;
  }

  async list(): Promise<readonly Readonly<ActivityEvent>[]> {
    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new InvalidActivityError();
    }
    if (envelope.activity === undefined) {
      return [];
    }
    if (
      !Array.isArray(envelope.activity) ||
      !envelope.activity.every(isEvent)
    ) {
      throw new InvalidActivityError();
    }
    return structuredClone(envelope.activity).sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    );
  }
}

function isEvent(value: unknown): value is ActivityEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.occurredAt === "string" &&
    (candidate.siteId === undefined || typeof candidate.siteId === "string") &&
    (candidate.tabId === undefined || typeof candidate.tabId === "number") &&
    (candidate.metadata === undefined ||
      (typeof candidate.metadata === "object" &&
        candidate.metadata !== null &&
        !Array.isArray(candidate.metadata)))
  );
}

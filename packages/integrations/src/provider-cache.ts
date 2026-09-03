import type { StorageRepository } from "@productivity-police/storage";

export const PROVIDER_IDS = ["github", "jira", "linear"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];
export type ProviderErrorCode =
  "NETWORK_ERROR" | "AUTH_EXPIRED" | "RATE_LIMITED" | "PROVIDER_ERROR";
export type IntegrationCacheStatus = "fresh" | "stale" | "unavailable";

export interface ExternalTask {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly priority?: string | undefined;
  readonly source: ProviderId;
}

export interface IntegrationCache {
  readonly provider: ProviderId;
  readonly tasks: readonly Readonly<ExternalTask>[];
  readonly lastSyncedAt: string;
  readonly lastSuccessAt?: string | undefined;
  readonly status: IntegrationCacheStatus;
  readonly errorCode?: ProviderErrorCode | undefined;
}

export interface TaskProvider {
  readonly id: ProviderId;
  getAssignedTasks(): Promise<readonly ExternalTask[]>;
  getAssignedTasksUrl(): string;
  refresh(): Promise<readonly ExternalTask[]>;
}

export class ProviderRefreshError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "ProviderRefreshError";
  }
}

export class IntegrationCacheRepository {
  readonly #storage: StorageRepository;

  constructor(storage: StorageRepository) {
    this.#storage = storage;
  }

  async read(
    provider: ProviderId,
  ): Promise<Readonly<IntegrationCache> | undefined> {
    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new Error("A versioned storage envelope is required");
    }
    const integrations = readRecord(envelope.integrations);
    const caches = readRecord(integrations.caches);
    const cache = caches[provider];
    return isIntegrationCache(cache, provider) ? freezeCache(cache) : undefined;
  }

  async write(cache: IntegrationCache): Promise<void> {
    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new Error("A versioned storage envelope is required");
    }
    const integrations = readRecord(envelope.integrations);
    const caches = readRecord(integrations.caches);
    await this.#storage.write({
      ...envelope,
      integrations: {
        ...integrations,
        caches: { ...caches, [cache.provider]: structuredClone(cache) },
      },
    });
  }
}

export async function refreshProviderCache(
  provider: TaskProvider,
  repository: IntegrationCacheRepository,
  now: Date,
): Promise<Readonly<IntegrationCache>> {
  const attemptedAt = toInstant(now);
  try {
    const tasks = validateTasks(await provider.refresh(), provider.id);
    const cache: IntegrationCache = {
      provider: provider.id,
      tasks,
      lastSyncedAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      status: "fresh",
    };
    await repository.write(cache);
    return freezeCache(cache);
  } catch (error) {
    const previous = await repository.read(provider.id);
    const cache: IntegrationCache = {
      provider: provider.id,
      tasks: previous?.tasks ?? [],
      lastSyncedAt: attemptedAt,
      ...(previous?.lastSuccessAt === undefined
        ? {}
        : { lastSuccessAt: previous.lastSuccessAt }),
      status: previous === undefined ? "unavailable" : "stale",
      errorCode:
        error instanceof ProviderRefreshError ? error.code : "PROVIDER_ERROR",
    };
    await repository.write(cache);
    return freezeCache(cache);
  }
}

function validateTasks(
  tasks: readonly ExternalTask[],
  provider: ProviderId,
): readonly Readonly<ExternalTask>[] {
  return Object.freeze(
    tasks.map((task) => {
      if (
        task.source !== provider ||
        task.id.trim().length === 0 ||
        task.title.trim().length === 0 ||
        !isHttpUrl(task.url)
      ) {
        throw new ProviderRefreshError(
          "PROVIDER_ERROR",
          "Invalid provider task",
        );
      }
      return Object.freeze({ ...task });
    }),
  );
}

function freezeCache(cache: IntegrationCache): Readonly<IntegrationCache> {
  return Object.freeze({
    ...cache,
    tasks: Object.freeze(cache.tasks.map((task) => Object.freeze({ ...task }))),
  });
}

function isIntegrationCache(
  value: unknown,
  provider: ProviderId,
): value is IntegrationCache {
  if (
    !isRecord(value) ||
    value.provider !== provider ||
    !Array.isArray(value.tasks)
  ) {
    return false;
  }
  return (
    typeof value.lastSyncedAt === "string" &&
    (value.lastSuccessAt === undefined ||
      typeof value.lastSuccessAt === "string") &&
    (value.status === "fresh" ||
      value.status === "stale" ||
      value.status === "unavailable") &&
    (value.errorCode === undefined ||
      (typeof value.errorCode === "string" &&
        [
          "NETWORK_ERROR",
          "AUTH_EXPIRED",
          "RATE_LIMITED",
          "PROVIDER_ERROR",
        ].includes(value.errorCode))) &&
    value.tasks.every((task) => isExternalTask(task, provider))
  );
}

function isExternalTask(
  value: unknown,
  provider: ProviderId,
): value is ExternalTask {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    isHttpUrl(value.url) &&
    (value.priority === undefined || typeof value.priority === "string") &&
    value.source === provider
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function toInstant(value: Date): string {
  if (!Number.isFinite(value.getTime())) {
    throw new RangeError("A valid refresh instant is required");
  }
  return value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

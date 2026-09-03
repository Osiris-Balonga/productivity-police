import type { StorageRepository } from "@productivity-police/storage";

import {
  PROVIDER_IDS,
  ProviderRefreshError,
  type ExternalTask,
  type ProviderId,
} from "./provider-cache";

export const minimumReadScopes = Object.freeze({
  github: Object.freeze(["issues:read"]),
  jira: Object.freeze(["read:jira-work", "read:jira-user", "offline_access"]),
  linear: Object.freeze(["read", "offline_access"]),
}) satisfies Readonly<Record<ProviderId, readonly string[]>>;

export interface IntegrationCredential {
  readonly provider: ProviderId;
  readonly accessToken: string;
  readonly refreshToken?: string | undefined;
  readonly expiresAt?: string | undefined;
  readonly accountRef: string;
  readonly scopes: readonly string[];
}

export interface IntegrationConfig {
  readonly provider: ProviderId;
  readonly connected: boolean;
  readonly accountRef: string;
  readonly status: "connected" | "AUTH_EXPIRED";
  readonly scopes: readonly string[];
}

export interface ProviderTaskPage {
  readonly tasks: readonly ExternalTask[];
  readonly nextCursor?: string | undefined;
}

export interface OAuthAdapter {
  readonly provider: ProviderId;
  authorize(scopes: readonly string[]): Promise<IntegrationCredential>;
  refreshCredential(
    credential: Readonly<IntegrationCredential>,
  ): Promise<IntegrationCredential>;
  revoke(credential: Readonly<IntegrationCredential>): Promise<void>;
  getAssignedTasksPage(
    credential: Readonly<IntegrationCredential>,
    cursor?: string,
  ): Promise<ProviderTaskPage>;
}

export class IntegrationAuthRepository {
  readonly #storage: StorageRepository;

  constructor(storage: StorageRepository) {
    this.#storage = storage;
  }

  async readCredential(
    provider: ProviderId,
  ): Promise<Readonly<IntegrationCredential> | undefined> {
    const integrations = await this.#readIntegrations();
    const value = readRecord(integrations.credentials)[provider];
    return isCredential(value, provider) ? freezeCredential(value) : undefined;
  }

  async readConfig(
    provider: ProviderId,
  ): Promise<Readonly<IntegrationConfig> | undefined> {
    const integrations = await this.#readIntegrations();
    const value = readRecord(integrations.configs)[provider];
    return isConfig(value, provider) ? freezeConfig(value) : undefined;
  }

  async connect(
    credential: IntegrationCredential,
    config: IntegrationConfig,
  ): Promise<void> {
    const envelope = await this.#readEnvelope();
    const integrations = readRecord(envelope.integrations);
    await this.#storage.write({
      ...envelope,
      integrations: {
        ...integrations,
        credentials: {
          ...readRecord(integrations.credentials),
          [credential.provider]: structuredClone(credential),
        },
        configs: {
          ...readRecord(integrations.configs),
          [config.provider]: structuredClone(config),
        },
      },
    });
  }

  async markAuthExpired(provider: ProviderId): Promise<void> {
    const envelope = await this.#readEnvelope();
    const integrations = readRecord(envelope.integrations);
    const configs = readRecord(integrations.configs);
    const current = configs[provider];
    if (!isConfig(current, provider)) {
      return;
    }
    await this.#storage.write({
      ...envelope,
      integrations: {
        ...integrations,
        configs: {
          ...configs,
          [provider]: {
            ...current,
            connected: false,
            status: "AUTH_EXPIRED",
          },
        },
      },
    });
  }

  async removeProvider(provider: ProviderId): Promise<void> {
    const envelope = await this.#readEnvelope();
    const integrations = readRecord(envelope.integrations);
    const credentials = omitProvider(
      readRecord(integrations.credentials),
      provider,
    );
    const configs = omitProvider(readRecord(integrations.configs), provider);
    const caches = omitProvider(readRecord(integrations.caches), provider);
    await this.#storage.write({
      ...envelope,
      integrations: { ...integrations, credentials, configs, caches },
    });
  }

  async #readEnvelope() {
    const envelope = await this.#storage.read();
    if (envelope === undefined) {
      throw new Error("A versioned storage envelope is required");
    }
    return envelope;
  }

  async #readIntegrations(): Promise<Record<string, unknown>> {
    return readRecord((await this.#readEnvelope()).integrations);
  }
}

export class ProviderAuthService {
  readonly #repository: IntegrationAuthRepository;

  constructor(repository: IntegrationAuthRepository) {
    this.#repository = repository;
  }

  async connect(adapter: OAuthAdapter): Promise<Readonly<IntegrationConfig>> {
    const scopes = minimumReadScopes[adapter.provider];
    const credential = await adapter.authorize(scopes);
    assertCredential(credential, adapter.provider, scopes);
    const config: IntegrationConfig = {
      provider: adapter.provider,
      connected: true,
      accountRef: credential.accountRef,
      status: "connected",
      scopes,
    };
    await this.#repository.connect(credential, config);
    return freezeConfig(config);
  }

  async disconnect(adapter: OAuthAdapter): Promise<void> {
    const credential = await this.#repository.readCredential(adapter.provider);
    if (credential !== undefined) {
      try {
        await adapter.revoke(credential);
      } catch {
        // Local credential and cache removal must not depend on provider uptime.
      }
    }
    await this.#repository.removeProvider(adapter.provider);
  }

  async getValidCredential(
    adapter: OAuthAdapter,
    now: Date,
  ): Promise<{
    readonly credential: Readonly<IntegrationCredential> | undefined;
    readonly reconnectRequired: boolean;
  }> {
    const credential = await this.#repository.readCredential(adapter.provider);
    if (credential === undefined) {
      return { credential: undefined, reconnectRequired: true };
    }
    if (!isExpired(credential, now)) {
      return { credential, reconnectRequired: false };
    }
    try {
      const refreshed = await adapter.refreshCredential(credential);
      assertCredential(
        refreshed,
        adapter.provider,
        minimumReadScopes[adapter.provider],
      );
      await this.#repository.connect(refreshed, {
        provider: adapter.provider,
        connected: true,
        accountRef: refreshed.accountRef,
        status: "connected",
        scopes: minimumReadScopes[adapter.provider],
      });
      return {
        credential: freezeCredential(refreshed),
        reconnectRequired: false,
      };
    } catch {
      await this.#repository.markAuthExpired(adapter.provider);
      return { credential: undefined, reconnectRequired: true };
    }
  }

  async getAllAssignedTasks(
    adapter: OAuthAdapter,
    credential: Readonly<IntegrationCredential>,
  ): Promise<readonly Readonly<ExternalTask>[]> {
    const tasks: ExternalTask[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await adapter.getAssignedTasksPage(credential, cursor);
      for (const task of page.tasks) {
        if (task.source !== adapter.provider) {
          throw new ProviderRefreshError(
            "PROVIDER_ERROR",
            "Invalid task source",
          );
        }
        tasks.push(Object.freeze({ ...task }));
      }
      cursor = page.nextCursor;
      if (cursor !== undefined) {
        if (seenCursors.has(cursor)) {
          throw new ProviderRefreshError("PROVIDER_ERROR", "Pagination cycle");
        }
        seenCursors.add(cursor);
      }
    } while (cursor !== undefined);
    return Object.freeze(tasks);
  }
}

function assertCredential(
  credential: IntegrationCredential,
  provider: ProviderId,
  scopes: readonly string[],
): void {
  if (
    !isCredential(credential, provider) ||
    credential.accessToken.length === 0 ||
    credential.accountRef.length === 0 ||
    !sameStringSet(credential.scopes, scopes)
  ) {
    throw new ProviderRefreshError("AUTH_EXPIRED", "Invalid OAuth credential");
  }
}

function isExpired(credential: IntegrationCredential, now: Date): boolean {
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("A valid credential check instant is required");
  }
  return (
    credential.expiresAt !== undefined &&
    new Date(credential.expiresAt).getTime() <= now.getTime()
  );
}

function isCredential(
  value: unknown,
  provider: ProviderId,
): value is IntegrationCredential {
  return (
    isRecord(value) &&
    value.provider === provider &&
    typeof value.accessToken === "string" &&
    (value.refreshToken === undefined ||
      typeof value.refreshToken === "string") &&
    (value.expiresAt === undefined || typeof value.expiresAt === "string") &&
    typeof value.accountRef === "string" &&
    Array.isArray(value.scopes) &&
    value.scopes.every((scope) => typeof scope === "string")
  );
}

function isConfig(
  value: unknown,
  provider: ProviderId,
): value is IntegrationConfig {
  return (
    isRecord(value) &&
    value.provider === provider &&
    typeof value.connected === "boolean" &&
    typeof value.accountRef === "string" &&
    (value.status === "connected" || value.status === "AUTH_EXPIRED") &&
    Array.isArray(value.scopes) &&
    value.scopes.every((scope) => typeof scope === "string")
  );
}

function freezeCredential(
  credential: IntegrationCredential,
): Readonly<IntegrationCredential> {
  return Object.freeze({
    ...credential,
    scopes: Object.freeze([...credential.scopes]),
  });
}

function freezeConfig(config: IntegrationConfig): Readonly<IntegrationConfig> {
  return Object.freeze({
    ...config,
    scopes: Object.freeze([...config.scopes]),
  });
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function omitProvider(
  values: Record<string, unknown>,
  provider: ProviderId,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => key !== provider),
  );
}

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" && PROVIDER_IDS.includes(value as ProviderId)
  );
}

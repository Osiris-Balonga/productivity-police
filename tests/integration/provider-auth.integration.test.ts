import { describe, expect, it } from "vitest";

import {
  IntegrationAuthRepository,
  ProviderAuthService,
  minimumReadScopes,
  type IntegrationCredential,
  type OAuthAdapter,
  type ProviderTaskPage,
} from "../../packages/integrations/src";
import {
  MemoryStorageArea,
  VersionedStorageRepository,
} from "../../packages/storage/src";

const CREDENTIAL: IntegrationCredential = {
  provider: "github",
  accessToken: "synthetic-access-token",
  refreshToken: "synthetic-refresh-token",
  expiresAt: "2026-09-03T10:00:00.000Z",
  accountRef: "account-1",
  scopes: minimumReadScopes.github,
};

function createHarness() {
  const area = new MemoryStorageArea({
    productivityPolice: {
      schemaVersion: 1,
      integrations: {
        credentials: { github: CREDENTIAL },
        configs: {
          github: {
            provider: "github",
            connected: true,
            accountRef: "account-1",
            status: "connected",
            scopes: minimumReadScopes.github,
          },
        },
        caches: {
          github: {
            provider: "github",
            tasks: [],
            lastSyncedAt: "2026-09-03T08:00:00.000Z",
            lastSuccessAt: "2026-09-03T08:00:00.000Z",
            status: "fresh",
          },
        },
      },
    },
  });
  const repository = new IntegrationAuthRepository(
    new VersionedStorageRepository(area),
  );
  return { area, repository, service: new ProviderAuthService(repository) };
}

function createAdapter(overrides: Partial<OAuthAdapter> = {}): OAuthAdapter {
  return {
    provider: "github",
    authorize: () => Promise.resolve(CREDENTIAL),
    refreshCredential: () => Promise.resolve(CREDENTIAL),
    revoke: () => Promise.resolve(),
    getAssignedTasksPage: () =>
      Promise.resolve({ tasks: [], nextCursor: undefined }),
    ...overrides,
  };
}

describe("provider OAuth lifecycle", () => {
  it("INT-11 attempts revocation then removes credential, config, and cache", async () => {
    const { area, service } = createHarness();
    let revokeAttempts = 0;
    const adapter = createAdapter({
      revoke: () => {
        revokeAttempts += 1;
        return Promise.reject(new Error("provider unavailable"));
      },
    });

    await service.disconnect(adapter);

    expect(revokeAttempts).toBe(1);
    const envelope = (await area.get("productivityPolice"))
      .productivityPolice as {
      integrations: {
        credentials: Record<string, unknown>;
        configs: Record<string, unknown>;
        caches: Record<string, unknown>;
      };
    };
    expect(envelope.integrations.credentials.github).toBeUndefined();
    expect(envelope.integrations.configs.github).toBeUndefined();
    expect(envelope.integrations.caches.github).toBeUndefined();
  });

  it("INT-12 marks an expired credential AUTH_EXPIRED when refresh fails", async () => {
    const { repository, service } = createHarness();
    const adapter = createAdapter({
      refreshCredential: () => Promise.reject(new Error("refresh rejected")),
    });

    await expect(
      service.getValidCredential(adapter, new Date("2026-09-03T11:00:00.000Z")),
    ).resolves.toEqual({ credential: undefined, reconnectRequired: true });
    await expect(repository.readConfig("github")).resolves.toMatchObject({
      status: "AUTH_EXPIRED",
      connected: false,
    });
  });

  it("INT-13 follows every page and returns all normalized assigned tasks", async () => {
    const { service } = createHarness();
    const pages: Record<string, ProviderTaskPage> = {
      first: {
        tasks: [
          {
            id: "one",
            title: "First assigned issue",
            url: "https://tasks.test/one",
            source: "github",
          },
        ],
        nextCursor: "second",
      },
      second: {
        tasks: [
          {
            id: "two",
            title: "Second assigned issue",
            url: "https://tasks.test/two",
            source: "github",
          },
        ],
      },
    };
    const adapter = createAdapter({
      getAssignedTasksPage: (_credential, cursor) => {
        const page = pages[cursor ?? "first"];
        return page === undefined
          ? Promise.reject(new Error("Unexpected page"))
          : Promise.resolve(page);
      },
    });

    await expect(
      service.getAllAssignedTasks(adapter, CREDENTIAL),
    ).resolves.toEqual([
      expect.objectContaining({ id: "one" }),
      expect.objectContaining({ id: "two" }),
    ]);
  });

  it("INT-14 authorizes with only the provider minimum read scopes", async () => {
    const { repository, service } = createHarness();
    let requestedScopes: readonly string[] = [];
    const adapter = createAdapter({
      authorize: (scopes) => {
        requestedScopes = scopes;
        return Promise.resolve(CREDENTIAL);
      },
    });

    await service.connect(adapter);

    expect(requestedScopes).toEqual(minimumReadScopes.github);
    expect(minimumReadScopes).toEqual({
      github: ["issues:read"],
      jira: ["read:jira-work", "offline_access"],
      linear: ["read"],
    });
    await expect(repository.readCredential("github")).resolves.toEqual(
      CREDENTIAL,
    );
  });
});

import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  ChromeStorageArea,
  CURRENT_SCHEMA_VERSION,
  VersionedStorageRepository,
} from "./index";

describe("Chrome storage adapter", () => {
  it("stores one versioned envelope behind an injected Chrome area", async () => {
    const get = vi.fn().mockResolvedValue({
      productivityPolice: { schemaVersion: CURRENT_SCHEMA_VERSION },
    });
    const set = vi.fn().mockResolvedValue(undefined);
    const repository = new VersionedStorageRepository(
      new ChromeStorageArea({ get, set }),
    );

    await expect(repository.read()).resolves.toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    await repository.write({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      activity: [],
    });

    expect(get).toHaveBeenCalledWith("productivityPolice");
    expect(set).toHaveBeenCalledWith({
      productivityPolice: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        activity: [],
      },
    });
  });

  it("declares only the permissions required by implemented adapters", async () => {
    const manifest = JSON.parse(
      await readFile(
        new URL(
          "../../../apps/extension/public/manifest.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as { permissions?: string[] };

    expect(manifest.permissions).toEqual(["alarms", "idle", "storage", "tabs"]);
    expect(manifest).not.toHaveProperty("host_permissions");
  });
});

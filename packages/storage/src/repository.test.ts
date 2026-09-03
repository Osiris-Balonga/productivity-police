import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  MemoryStorageArea,
  VersionedStorageRepository,
  openCurrentStorage,
} from "./index";

describe("memory-backed versioned storage", () => {
  it("MIG-01 opens the current schema without writing or migrating", async () => {
    const area = new MemoryStorageArea({
      productivityPolice: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        settings: { locale: "en" },
      },
    });
    const repository = new VersionedStorageRepository(area);

    await expect(openCurrentStorage(repository)).resolves.toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { locale: "en" },
    });
    expect(area.writeCount).toBe(0);
  });

  it("returns isolated values instead of shared mutable state", async () => {
    const area = new MemoryStorageArea();
    const repository = new VersionedStorageRepository(area);
    const envelope = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { locale: "fr" },
    };

    await repository.write(envelope);
    envelope.settings.locale = "en";

    await expect(repository.read()).resolves.toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { locale: "fr" },
    });
  });

  it("rejects malformed envelopes without overwriting stored data", async () => {
    const area = new MemoryStorageArea({
      productivityPolice: { schemaVersion: "1", settings: { locale: "fr" } },
    });
    const repository = new VersionedStorageRepository(area);

    await expect(repository.read()).rejects.toThrow("Invalid storage envelope");
    expect(area.writeCount).toBe(0);
  });
});

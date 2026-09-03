import { describe, expect, it } from "vitest";

import {
  MemoryStorageArea,
  MigrationPipeline,
  VersionedStorageRepository,
  migrateToCurrentSchema,
  type StorageMigration,
} from "./index";

function createRepository(initialEnvelope: Record<string, unknown>) {
  const area = new MemoryStorageArea({ productivityPolice: initialEnvelope });
  return { area, repository: new VersionedStorageRepository(area) };
}

const sequentialMigrations: readonly StorageMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: (envelope) => ({
      ...envelope,
      schemaVersion: 1,
      firstStepApplied: true,
    }),
  },
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (envelope) => {
      if (envelope.firstStepApplied !== true) {
        throw new Error("Migration order was not respected");
      }

      return { ...envelope, schemaVersion: 2, secondStepApplied: true };
    },
  },
];

describe("sequential migration pipeline", () => {
  it("upgrades the supported legacy envelope without dropping unknown data", async () => {
    const { repository } = createRepository({
      schemaVersion: 0,
      retainedData: { value: "keep-me" },
    });

    await expect(migrateToCurrentSchema(repository)).resolves.toEqual({
      schemaVersion: 1,
      retainedData: { value: "keep-me" },
      activity: [],
      integrations: {},
      reports: [],
      usageByDate: {},
      websiteRules: [],
    });
  });

  it("MIG-02 applies every missing migration in order and commits once", async () => {
    const { area, repository } = createRepository({
      schemaVersion: 0,
      retainedData: { value: "keep-me" },
    });
    const pipeline = new MigrationPipeline(2, sequentialMigrations);

    await expect(pipeline.run(repository)).resolves.toEqual({
      schemaVersion: 2,
      retainedData: { value: "keep-me" },
      firstStepApplied: true,
      secondStepApplied: true,
    });
    expect(area.writeCount).toBe(1);
  });

  it("MIG-03 is idempotent when the migrated envelope is loaded again", async () => {
    const { area, repository } = createRepository({
      schemaVersion: 0,
      retainedData: { value: "keep-me" },
    });
    const pipeline = new MigrationPipeline(2, sequentialMigrations);

    const firstResult = await pipeline.run(repository);
    const secondResult = await pipeline.run(repository);

    expect(secondResult).toEqual(firstResult);
    expect(area.writeCount).toBe(1);
  });

  it("MIG-04 preserves the original version and data when a step fails", async () => {
    const originalEnvelope = {
      schemaVersion: 0,
      retainedData: { value: "keep-me" },
    };
    const { area, repository } = createRepository(originalEnvelope);
    const pipeline = new MigrationPipeline(1, [
      {
        fromVersion: 0,
        toVersion: 1,
        migrate: (envelope) => {
          envelope.retainedData = { value: "mutated-copy" };
          throw new Error("synthetic migration failure");
        },
      },
    ]);

    await expect(pipeline.run(repository)).rejects.toThrow(
      "synthetic migration failure",
    );
    await expect(repository.read()).resolves.toEqual(originalEnvelope);
    expect(area.writeCount).toBe(0);
  });

  it("refuses a migration that silently removes a stored section", async () => {
    const { area, repository } = createRepository({
      schemaVersion: 0,
      retainedData: { value: "keep-me" },
    });
    const pipeline = new MigrationPipeline(1, [
      {
        fromVersion: 0,
        toVersion: 1,
        migrate: () => ({ schemaVersion: 1 }),
      },
    ]);

    await expect(pipeline.run(repository)).rejects.toThrow(
      "removed stored section: retainedData",
    );
    expect(area.writeCount).toBe(0);
  });
});

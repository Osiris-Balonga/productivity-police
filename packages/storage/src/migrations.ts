import {
  CURRENT_SCHEMA_VERSION,
  isStorageEnvelope,
  type StorageEnvelope,
} from "./model";
import {
  InvalidStorageEnvelopeError,
  UnsupportedSchemaVersionError,
  type StorageRepository,
} from "./repository";

export interface StorageMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrate: (
    envelope: StorageEnvelope,
  ) => StorageEnvelope | Promise<StorageEnvelope>;
}

export class MissingStorageMigrationError extends Error {
  constructor(readonly fromVersion: number) {
    super(`Missing storage migration from version ${String(fromVersion)}`);
    this.name = "MissingStorageMigrationError";
  }
}

export class InvalidStorageMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStorageMigrationError";
  }
}

export class MigrationDataLossError extends Error {
  constructor(readonly section: string) {
    super(`Migration removed stored section: ${section}`);
    this.name = "MigrationDataLossError";
  }
}

type EnvelopeValidator = (envelope: StorageEnvelope) => boolean;

export class MigrationPipeline {
  readonly #targetVersion: number;
  readonly #migrations: ReadonlyMap<number, StorageMigration>;
  readonly #validate: EnvelopeValidator;

  constructor(
    targetVersion: number,
    migrations: readonly StorageMigration[],
    validate: EnvelopeValidator = isStorageEnvelope,
  ) {
    if (!Number.isInteger(targetVersion) || targetVersion < 0) {
      throw new InvalidStorageMigrationError("Invalid target schema version");
    }

    const migrationMap = new Map<number, StorageMigration>();
    for (const migration of migrations) {
      if (migration.toVersion !== migration.fromVersion + 1) {
        throw new InvalidStorageMigrationError(
          "Storage migrations must advance exactly one version",
        );
      }
      if (migrationMap.has(migration.fromVersion)) {
        throw new InvalidStorageMigrationError(
          `Duplicate storage migration from version ${String(migration.fromVersion)}`,
        );
      }
      migrationMap.set(migration.fromVersion, migration);
    }

    this.#targetVersion = targetVersion;
    this.#migrations = migrationMap;
    this.#validate = validate;
  }

  async run(
    repository: StorageRepository,
  ): Promise<StorageEnvelope | undefined> {
    const storedEnvelope = await repository.read();
    if (storedEnvelope === undefined) {
      return undefined;
    }
    if (storedEnvelope.schemaVersion > this.#targetVersion) {
      throw new UnsupportedSchemaVersionError(storedEnvelope.schemaVersion);
    }
    if (storedEnvelope.schemaVersion === this.#targetVersion) {
      return storedEnvelope;
    }

    let workingEnvelope = structuredClone(storedEnvelope);
    while (workingEnvelope.schemaVersion < this.#targetVersion) {
      const migration = this.#migrations.get(workingEnvelope.schemaVersion);
      if (migration === undefined) {
        throw new MissingStorageMigrationError(workingEnvelope.schemaVersion);
      }

      const previousEnvelope = workingEnvelope;
      const candidate = await migration.migrate(
        structuredClone(previousEnvelope),
      );
      if (
        !isStorageEnvelope(candidate) ||
        candidate.schemaVersion !== migration.toVersion
      ) {
        throw new InvalidStorageMigrationError(
          `Migration from version ${String(migration.fromVersion)} returned an invalid envelope`,
        );
      }

      assertNoStoredSectionWasRemoved(previousEnvelope, candidate);
      workingEnvelope = structuredClone(candidate);
    }

    if (!this.#validate(workingEnvelope)) {
      throw new InvalidStorageEnvelopeError();
    }

    await repository.write(workingEnvelope);
    return workingEnvelope;
  }
}

function assertNoStoredSectionWasRemoved(
  before: StorageEnvelope,
  after: StorageEnvelope,
): void {
  for (const section of Object.keys(before)) {
    if (section !== "schemaVersion" && !(section in after)) {
      throw new MigrationDataLossError(section);
    }
  }
}

export const storageMigrations: readonly StorageMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    migrate: (envelope) => ({
      ...envelope,
      schemaVersion: 1,
      activity: envelope.activity ?? [],
      integrations: envelope.integrations ?? {},
      reports: envelope.reports ?? [],
      usageByDate: envelope.usageByDate ?? {},
      websiteRules: envelope.websiteRules ?? [],
    }),
  },
];

const currentMigrationPipeline = new MigrationPipeline(
  CURRENT_SCHEMA_VERSION,
  storageMigrations,
);

export function migrateToCurrentSchema(
  repository: StorageRepository,
): Promise<StorageEnvelope | undefined> {
  return currentMigrationPipeline.run(repository);
}

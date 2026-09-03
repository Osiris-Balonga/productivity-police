import {
  isStorageEnvelope,
  ROOT_STORAGE_KEY,
  type StorageEnvelope,
} from "./model";
import type { StorageArea } from "./storage-area";

export class InvalidStorageEnvelopeError extends Error {
  constructor() {
    super("Invalid storage envelope");
    this.name = "InvalidStorageEnvelopeError";
  }
}

export class UnsupportedSchemaVersionError extends Error {
  constructor(readonly schemaVersion: number) {
    super(`Unsupported schema version: ${String(schemaVersion)}`);
    this.name = "UnsupportedSchemaVersionError";
  }
}

export interface StorageRepository {
  read(): Promise<StorageEnvelope | undefined>;
  write(envelope: StorageEnvelope): Promise<void>;
}

export class VersionedStorageRepository implements StorageRepository {
  readonly #area: StorageArea;
  readonly #rootKey: string;

  constructor(area: StorageArea, rootKey = ROOT_STORAGE_KEY) {
    this.#area = area;
    this.#rootKey = rootKey;
  }

  async read(): Promise<StorageEnvelope | undefined> {
    const values = await this.#area.get(this.#rootKey);
    const envelope = values[this.#rootKey];

    if (envelope === undefined) {
      return undefined;
    }

    if (!isStorageEnvelope(envelope)) {
      throw new InvalidStorageEnvelopeError();
    }

    return envelope;
  }

  async write(envelope: StorageEnvelope): Promise<void> {
    if (!isStorageEnvelope(envelope)) {
      throw new InvalidStorageEnvelopeError();
    }

    await this.#area.set({ [this.#rootKey]: envelope });
  }
}

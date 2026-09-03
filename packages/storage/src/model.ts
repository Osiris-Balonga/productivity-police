export const CURRENT_SCHEMA_VERSION = 1;
export const ROOT_STORAGE_KEY = "productivityPolice";

export interface StorageEnvelope {
  schemaVersion: number;
  [section: string]: unknown;
}

export function isStorageEnvelope(value: unknown): value is StorageEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const schemaVersion = (value as Record<string, unknown>).schemaVersion;
  return (
    typeof schemaVersion === "number" &&
    Number.isInteger(schemaVersion) &&
    schemaVersion >= 0
  );
}

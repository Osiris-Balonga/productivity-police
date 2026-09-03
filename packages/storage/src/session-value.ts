import type { StorageArea } from "./storage-area";

export class InvalidSessionValueError extends Error {
  constructor(readonly key: string) {
    super(`Invalid session value: ${key}`);
    this.name = "InvalidSessionValueError";
  }
}

export class SessionValueRepository<T> {
  readonly #area: StorageArea;
  readonly #key: string;
  readonly #validate: (value: unknown) => value is T;

  constructor(
    area: StorageArea,
    key: string,
    validate: (value: unknown) => value is T,
  ) {
    this.#area = area;
    this.#key = key;
    this.#validate = validate;
  }

  async read(): Promise<T | undefined> {
    const values = await this.#area.get(this.#key);
    const value = values[this.#key];

    if (value === undefined) {
      return undefined;
    }
    if (!this.#validate(value)) {
      throw new InvalidSessionValueError(this.#key);
    }

    return structuredClone(value);
  }

  async write(value: T): Promise<void> {
    if (!this.#validate(value)) {
      throw new InvalidSessionValueError(this.#key);
    }
    await this.#area.set({ [this.#key]: structuredClone(value) });
  }
}

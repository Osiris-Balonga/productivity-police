export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryStorageArea implements StorageArea {
  readonly #values: Record<string, unknown>;
  #writeCount = 0;

  constructor(initialValues: Record<string, unknown> = {}) {
    this.#values = clone(initialValues);
  }

  get writeCount(): number {
    return this.#writeCount;
  }

  get(key: string): Promise<Record<string, unknown>> {
    if (!(key in this.#values)) {
      return Promise.resolve({});
    }

    return Promise.resolve({ [key]: clone(this.#values[key]) });
  }

  set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.#values, clone(items));
    this.#writeCount += 1;
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    Reflect.deleteProperty(this.#values, key);
    this.#writeCount += 1;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    for (const key of Object.keys(this.#values))
      Reflect.deleteProperty(this.#values, key);
    this.#writeCount += 1;
    return Promise.resolve();
  }
}

export interface ChromeStorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class ChromeStorageArea implements StorageArea {
  readonly #area: ChromeStorageAreaLike;

  constructor(area: ChromeStorageAreaLike) {
    this.#area = area;
  }

  get(key: string): Promise<Record<string, unknown>> {
    return this.#area.get(key);
  }

  set(items: Record<string, unknown>): Promise<void> {
    return this.#area.set(items);
  }

  remove(key: string): Promise<void> {
    return this.#area.remove(key);
  }

  clear(): Promise<void> {
    return this.#area.clear();
  }
}

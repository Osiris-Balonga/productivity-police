import type { TabOverride } from "@productivity-police/domain";

export class InMemoryTabOverrideRegistry {
  readonly #overrides = new Map<number, Readonly<TabOverride>>();

  get(tabId: number): Readonly<TabOverride> | undefined {
    return this.#overrides.get(tabId);
  }

  list(): readonly Readonly<TabOverride>[] {
    return [...this.#overrides.values()];
  }

  save(override: TabOverride): void {
    this.#overrides.set(override.tabId, Object.freeze({ ...override }));
  }

  remove(tabId: number): void {
    this.#overrides.delete(tabId);
  }
}

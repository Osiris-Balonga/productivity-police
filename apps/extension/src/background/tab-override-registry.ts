import {
  matchWebsiteRule,
  matchesCanonicalDomain,
  type TabOverride,
  type WebsiteRuleSet,
} from "@productivity-police/domain";
import {
  SessionValueRepository,
  type StorageArea,
} from "@productivity-police/storage";

const OVERRIDES_KEY = "tabOverrides";

export interface OverrideTabLocation {
  readonly id?: number | undefined;
  readonly url?: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTabOverride(value: unknown): value is TabOverride {
  return (
    isRecord(value) &&
    typeof value.tabId === "number" &&
    Number.isInteger(value.tabId) &&
    typeof value.siteId === "string" &&
    typeof value.canonicalDomain === "string" &&
    typeof value.justification === "string" &&
    typeof value.grantedAt === "string"
  );
}

function isTabOverrideList(value: unknown): value is TabOverride[] {
  return Array.isArray(value) && value.every(isTabOverride);
}

export class SessionTabOverrideRegistry {
  readonly #repository: SessionValueRepository<TabOverride[]>;

  constructor(area: StorageArea) {
    this.#repository = new SessionValueRepository(
      area,
      OVERRIDES_KEY,
      isTabOverrideList,
    );
  }

  async get(tabId: number): Promise<Readonly<TabOverride> | undefined> {
    return (await this.list()).find((override) => override.tabId === tabId);
  }

  async list(): Promise<readonly Readonly<TabOverride>[]> {
    return (await this.#repository.read()) ?? [];
  }

  async save(override: TabOverride): Promise<void> {
    const overrides = await this.list();
    await this.#repository.write([
      ...overrides.filter((candidate) => candidate.tabId !== override.tabId),
      { ...override },
    ]);
  }

  async remove(tabId: number): Promise<void> {
    const overrides = await this.list();
    const remaining = overrides.filter((override) => override.tabId !== tabId);
    if (remaining.length !== overrides.length) {
      await this.#repository.write(
        remaining.map((override) => ({ ...override })),
      );
    }
  }

  async reconcile(
    tabs: readonly OverrideTabLocation[],
    rules: WebsiteRuleSet,
  ): Promise<readonly Readonly<TabOverride>[]> {
    const overrides = await this.list();
    const valid = overrides.filter((override) => {
      const tab = tabs.find((candidate) => candidate.id === override.tabId);
      if (tab?.url === undefined) {
        return false;
      }
      try {
        return (
          matchesCanonicalDomain(tab.url, override.canonicalDomain) &&
          matchWebsiteRule(rules, tab.url)?.id === override.siteId
        );
      } catch {
        return false;
      }
    });
    if (valid.length !== overrides.length) {
      await this.#repository.write(valid.map((override) => ({ ...override })));
    }
    return valid;
  }
}

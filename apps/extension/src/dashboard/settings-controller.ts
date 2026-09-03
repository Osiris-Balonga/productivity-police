import {
  applySettingsPatch,
  canonicalizeDomain,
  isProductSettings,
  type ProductSettings,
  type ProductSettingsPatch,
  type WebsiteRule,
} from "@productivity-police/domain";
import type { StorageRepository } from "@productivity-police/storage";

export interface SettingsUpdate extends ProductSettingsPatch {
  readonly websiteRules?: readonly WebsiteRule[];
}

export interface SettingsSnapshot {
  readonly settings: Readonly<ProductSettings>;
  readonly websiteRules: readonly Readonly<WebsiteRule>[];
}

export class InvalidSettingsStateError extends Error {
  constructor() {
    super("Stored settings are unavailable or invalid");
    this.name = "InvalidSettingsStateError";
  }
}

export class SettingsController {
  readonly #repository: StorageRepository;
  readonly #afterPersist: () => Promise<void>;

  constructor(
    repository: StorageRepository,
    afterPersist: () => Promise<void> = () => Promise.resolve(),
  ) {
    this.#repository = repository;
    this.#afterPersist = afterPersist;
  }

  async read(): Promise<Readonly<SettingsSnapshot>> {
    const envelope = await this.#repository.read();
    if (envelope === undefined || !isProductSettings(envelope.settings)) {
      throw new InvalidSettingsStateError();
    }
    const websiteRules = readWebsiteRules(envelope.websiteRules);
    return Object.freeze({
      settings: Object.freeze(structuredClone(envelope.settings)),
      websiteRules: Object.freeze(websiteRules),
    });
  }

  async apply(update: SettingsUpdate): Promise<Readonly<SettingsSnapshot>> {
    const envelope = await this.#repository.read();
    if (envelope === undefined || !isProductSettings(envelope.settings)) {
      throw new InvalidSettingsStateError();
    }
    const settingsPatch: ProductSettingsPatch = {
      ...(update.enabled === undefined ? {} : { enabled: update.enabled }),
      ...(update.locale === undefined ? {} : { locale: update.locale }),
      ...(update.universe === undefined ? {} : { universe: update.universe }),
      ...(update.dailyAllowanceMinutes === undefined
        ? {}
        : { dailyAllowanceMinutes: update.dailyAllowanceMinutes }),
      ...(update.schedule === undefined ? {} : { schedule: update.schedule }),
    };
    const settings = applySettingsPatch(envelope.settings, settingsPatch);
    const websiteRules =
      update.websiteRules === undefined
        ? readWebsiteRules(envelope.websiteRules)
        : normalizeWebsiteRules(update.websiteRules);

    await this.#repository.write({
      ...envelope,
      settings,
      websiteRules,
    });
    await this.#afterPersist();
    return Object.freeze({
      settings,
      websiteRules: Object.freeze(websiteRules),
    });
  }
}

function normalizeWebsiteRules(
  rules: readonly WebsiteRule[],
): readonly Readonly<WebsiteRule>[] {
  return rules.map((rule) =>
    Object.freeze({ ...rule, domain: canonicalizeDomain(rule.domain) }),
  );
}

function readWebsiteRules(value: unknown): readonly Readonly<WebsiteRule>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isWebsiteRule).map((rule) => Object.freeze({ ...rule }));
}

function isWebsiteRule(value: unknown): value is WebsiteRule {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.domain === "string" &&
    (candidate.list === "blacklist" || candidate.list === "whitelist") &&
    typeof candidate.createdAt === "string"
  );
}

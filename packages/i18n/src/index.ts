import { en, type CatalogKey } from "./catalogs/en";
import { fr } from "./catalogs/fr";

export const supportedLocales = ["fr", "en"] as const;
export const fallbackLocale = "en" as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type { CatalogKey };

const catalogs: Record<SupportedLocale, Record<CatalogKey, string>> = {
  en,
  fr,
};

export const catalogKeys = Object.freeze(Object.keys(en) as CatalogKey[]);

export function resolveInitialLocale(
  browserLanguage: string | null | undefined,
): SupportedLocale {
  const primaryLanguage = browserLanguage
    ?.trim()
    .toLowerCase()
    .split(/[-_]/, 1)[0];

  return primaryLanguage === "fr" || primaryLanguage === "en"
    ? primaryLanguage
    : fallbackLocale;
}

export function translate(
  locale: SupportedLocale,
  key: CatalogKey,
  parameters: Readonly<Record<string, string | number>> = {},
): string {
  return Object.entries(parameters).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    catalogs[locale][key],
  );
}

export function validateCatalogParity(): {
  readonly valid: boolean;
  readonly differences: readonly string[];
} {
  const expectedKeys = new Set(Object.keys(en));
  const actualKeys = new Set(Object.keys(fr));
  const differences = [
    ...catalogKeys.filter((key) => !actualKeys.has(key)),
    ...Object.keys(fr).filter((key) => !expectedKeys.has(key)),
  ].sort();

  return Object.freeze({
    valid: differences.length === 0,
    differences: Object.freeze(differences),
  });
}

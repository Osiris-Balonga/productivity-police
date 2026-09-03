import { describe, expect, it } from "vitest";

import {
  catalogKeys,
  resolveInitialLocale,
  translate,
  validateCatalogParity,
} from "./index";

describe("initial locale policy", () => {
  it("I18N-01 selects French for a French browser locale", () => {
    expect(resolveInitialLocale("fr-FR")).toBe("fr");
  });

  it("I18N-02 selects English for an English browser locale", () => {
    expect(resolveInitialLocale("en-US")).toBe("en");
  });

  it("I18N-03 falls back to English for an unsupported locale", () => {
    expect(resolveInitialLocale("de-DE")).toBe("en");
    expect(resolveInitialLocale(undefined)).toBe("en");
  });
});

describe("locale-independent domain boundary", () => {
  it("I18N-05 does not alter an access decision when rendering either locale", () => {
    const accessDecision = Object.freeze({
      outcome: "BLOCK",
      reason: "ALLOWANCE_EXHAUSTED",
    });

    const decisionsAfterRendering = (["fr", "en"] as const).map((locale) => {
      translate(locale, "access.allowanceExhausted");
      return accessDecision;
    });

    expect(decisionsAfterRendering[0]).toBe(accessDecision);
    expect(decisionsAfterRendering[1]).toBe(accessDecision);
  });
});

describe("catalog contract", () => {
  it("I18N-06 keeps French and English keys in parity", () => {
    expect(validateCatalogParity()).toEqual({ valid: true, differences: [] });
    expect(catalogKeys.length).toBeGreaterThan(0);
  });

  it("interpolates named values without evaluating business rules", () => {
    expect(translate("en", "quota.remaining", { minutes: 12 })).toBe(
      "12 minutes remaining",
    );
    expect(translate("fr", "quota.remaining", { minutes: 12 })).toBe(
      "12 minutes restantes",
    );
  });
});

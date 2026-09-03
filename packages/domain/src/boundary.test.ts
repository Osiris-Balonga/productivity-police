import { describe, expect, it } from "vitest";

import { DOMAIN_PACKAGE } from "./index";

describe("domain package boundary", () => {
  it("loads in Node without a Chrome runtime", () => {
    expect(DOMAIN_PACKAGE).toBe("@productivity-police/domain");
    expect("chrome" in globalThis).toBe(false);
  });
});

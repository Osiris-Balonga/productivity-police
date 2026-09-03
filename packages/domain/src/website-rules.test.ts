import { describe, expect, it } from "vitest";

import {
  canonicalizeDomain,
  resolveWebsiteRule,
  type WebsiteRuleSet,
} from "./website-rules";

const rules: WebsiteRuleSet = {
  rules: [
    {
      id: "video-blacklist",
      name: "Video",
      domain: "video.test",
      list: "blacklist",
      createdAt: "2026-09-03T00:00:00.000Z",
    },
  ],
};

describe("website rule resolution", () => {
  it("WEB-01 resolves a blacklisted domain", () => {
    expect(resolveWebsiteRule(rules, "video.test")).toBe("BLACKLIST");
  });

  it("WEB-02 gives the whitelist priority over the blacklist", () => {
    const conflictingRules: WebsiteRuleSet = {
      rules: [
        ...rules.rules,
        {
          id: "video-whitelist",
          name: "Allowed video",
          domain: "VIDEO.TEST",
          list: "whitelist",
          createdAt: "2026-09-03T00:01:00.000Z",
        },
      ],
    };

    expect(resolveWebsiteRule(conflictingRules, "video.test")).toBe(
      "WHITELIST",
    );
  });

  it("WEB-03 resolves an unlisted domain as neutral", () => {
    expect(resolveWebsiteRule(rules, "work.test")).toBe("NEUTRAL");
  });

  it("WEB-05 canonicalizes a URL to a lowercase ASCII domain", () => {
    expect(
      canonicalizeDomain(
        "https://member:secret@www.Exämple.com.:8443/watch?q=1#player",
      ),
    ).toBe("xn--exmple-cua.com");
  });

  it("WEB-06 matches real subdomains without matching false suffixes", () => {
    const domainRules: WebsiteRuleSet = {
      rules: [
        {
          id: "example-blacklist",
          name: "Example",
          domain: "example.com",
          list: "blacklist",
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      ],
    };

    expect(resolveWebsiteRule(domainRules, "media.example.com")).toBe(
      "BLACKLIST",
    );
    expect(resolveWebsiteRule(domainRules, "notexample.com")).toBe("NEUTRAL");
  });
});

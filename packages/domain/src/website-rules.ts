export type WebsiteList = "blacklist" | "whitelist";
export type WebsiteRuleResolution = "BLACKLIST" | "WHITELIST" | "NEUTRAL";

export interface WebsiteRule {
  id: string;
  name: string;
  domain: string;
  list: WebsiteList;
  createdAt: string;
}

export interface WebsiteRuleSet {
  rules: readonly WebsiteRule[];
}

function domainKey(domain: string): string {
  return domain.trim().toLowerCase();
}

export function resolveWebsiteRule(
  ruleSet: WebsiteRuleSet,
  domain: string,
): WebsiteRuleResolution {
  const candidate = domainKey(domain);
  const matchingRules = ruleSet.rules.filter(
    (rule) => domainKey(rule.domain) === candidate,
  );

  if (matchingRules.some((rule) => rule.list === "whitelist")) {
    return "WHITELIST";
  }

  if (matchingRules.some((rule) => rule.list === "blacklist")) {
    return "BLACKLIST";
  }

  return "NEUTRAL";
}

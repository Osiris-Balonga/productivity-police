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

export function canonicalizeDomain(input: string): string {
  const value = input.trim();
  const parseable = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `http://${value}`;

  let hostname: string;

  try {
    hostname = new URL(parseable).hostname;
  } catch {
    throw new RangeError("A valid website domain or URL is required");
  }

  const canonical = hostname
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(/^www\./, "");

  if (canonical.length === 0) {
    throw new RangeError("A valid website domain or URL is required");
  }

  return canonical;
}

export function matchesCanonicalDomain(
  candidateInput: string,
  ruleInput: string,
): boolean {
  const candidate = canonicalizeDomain(candidateInput);
  const rule = canonicalizeDomain(ruleInput);

  return candidate === rule || candidate.endsWith(`.${rule}`);
}

export function resolveWebsiteRule(
  ruleSet: WebsiteRuleSet,
  domain: string,
): WebsiteRuleResolution {
  const rule = matchWebsiteRule(ruleSet, domain);
  return rule?.list === "whitelist"
    ? "WHITELIST"
    : rule?.list === "blacklist"
      ? "BLACKLIST"
      : "NEUTRAL";
}

export function matchWebsiteRule(
  ruleSet: WebsiteRuleSet,
  domain: string,
): WebsiteRule | undefined {
  const matchingRules = ruleSet.rules.filter((rule) =>
    matchesCanonicalDomain(domain, rule.domain),
  );

  const whitelistRule = matchingRules.find((rule) => rule.list === "whitelist");
  if (whitelistRule !== undefined) {
    return whitelistRule;
  }

  return matchingRules.find((rule) => rule.list === "blacklist");
}

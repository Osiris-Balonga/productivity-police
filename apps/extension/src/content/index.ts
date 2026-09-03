import type { SupportedLocale } from "@productivity-police/i18n";

import { renderContentSurface } from "./content-surface";

interface EnforcementDecisionMessage {
  type: "ENFORCEMENT_DECISION";
  decision: {
    action: "ALLOW" | "TRACK" | "WARN" | "BLOCK";
  };
  locale: SupportedLocale;
  siteId: string | undefined;
}

function isEnforcementDecisionMessage(
  message: unknown,
): message is EnforcementDecisionMessage {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const candidate = message as Record<string, unknown>;
  const decision = candidate.decision;
  return (
    candidate.type === "ENFORCEMENT_DECISION" &&
    typeof decision === "object" &&
    decision !== null &&
    ["ALLOW", "TRACK", "WARN", "BLOCK"].includes(
      String((decision as Record<string, unknown>).action),
    ) &&
    (candidate.locale === "en" || candidate.locale === "fr") &&
    (candidate.siteId === undefined || typeof candidate.siteId === "string")
  );
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isEnforcementDecisionMessage(message)) {
    renderContentSurface(document, {
      action: message.decision.action,
      locale: message.locale,
      siteId: message.siteId,
      grantOverride: async (justification) => {
        const response: unknown = await chrome.runtime.sendMessage({
          type: "GRANT_OVERRIDE",
          justification,
        });
        return (
          typeof response === "object" &&
          response !== null &&
          (response as Record<string, unknown>).granted === true
        );
      },
    });
  }
});

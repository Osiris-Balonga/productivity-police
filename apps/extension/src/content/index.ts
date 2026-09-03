import type { Universe } from "@productivity-police/domain";
import type { SupportedLocale } from "@productivity-police/i18n";
import type { BlockTaskGroup } from "@productivity-police/integrations";

import { renderContentSurface } from "./content-surface";

interface EnforcementDecisionMessage {
  type: "ENFORCEMENT_DECISION";
  decision: {
    action: "ALLOW" | "TRACK" | "WARN" | "BLOCK";
  };
  locale: SupportedLocale;
  universe: Universe;
  siteId: string | undefined;
  taskGroups: readonly Readonly<BlockTaskGroup>[];
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
    (candidate.universe === "student" || candidate.universe === "pro") &&
    (candidate.siteId === undefined || typeof candidate.siteId === "string") &&
    isBlockTaskGroups(candidate.taskGroups)
  );
}

function isBlockTaskGroups(value: unknown): value is readonly BlockTaskGroup[] {
  return (
    Array.isArray(value) &&
    value.every((groupValue) => {
      if (typeof groupValue !== "object" || groupValue === null) {
        return false;
      }
      const group = groupValue as Record<string, unknown>;
      const task = group.task;
      return (
        ["github", "jira", "linear"].includes(String(group.provider)) &&
        typeof group.taskCount === "number" &&
        Number.isInteger(group.taskCount) &&
        group.taskCount > 0 &&
        typeof task === "object" &&
        task !== null &&
        typeof (task as Record<string, unknown>).title === "string" &&
        typeof (task as Record<string, unknown>).url === "string"
      );
    })
  );
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isEnforcementDecisionMessage(message)) {
    renderContentSurface(document, {
      action: message.decision.action,
      locale: message.locale,
      universe: message.universe,
      siteId: message.siteId,
      taskGroups: message.taskGroups,
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

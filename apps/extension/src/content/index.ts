interface EnforcementDecisionMessage {
  type: "ENFORCEMENT_DECISION";
  decision: {
    action: "ALLOW" | "TRACK" | "WARN" | "BLOCK";
  };
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
    )
  );
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (isEnforcementDecisionMessage(message)) {
    document.documentElement.dataset.productivityPoliceDecision =
      message.decision.action;
  }
});

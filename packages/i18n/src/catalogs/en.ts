export const en = {
  "access.allowanceExhausted": "Your distraction allowance is exhausted",
  "access.blockedBody": "This site is blocked during your work period.",
  "access.blockedTitle": "Distraction allowance exhausted",
  "access.warningBody": "Return to your work before access is blocked.",
  "access.warningTitle": "Distraction allowance almost exhausted",
  "action.activate": "Activate Productivity Police",
  "app.name": "Productivity Police",
  "error.storageUnavailable": "Local data is temporarily unavailable",
  "nav.activity": "Activity",
  "nav.dashboard": "Dashboard",
  "nav.integrations": "Integrations",
  "nav.settings": "Settings",
  "override.error": "The override could not be granted. Try again.",
  "override.firstBody":
    "Confirm that you understand this time counts against your plan.",
  "override.firstConfirm": "I understand",
  "override.firstTitle": "Do you need access right now?",
  "override.justificationLabel": "Why is this access necessary?",
  "override.justificationPlaceholder": "Give a specific work-related reason",
  "override.request": "Request override",
  "override.secondBody":
    "This exception applies only to this tab and will be recorded.",
  "override.secondConfirm": "Continue anyway",
  "override.secondTitle": "Are you sure?",
  "override.submit": "Unlock this tab",
  "quota.remaining": "{minutes} minutes remaining",
  "status.break": "Break",
  "status.offDuty": "Off duty",
  "status.onDuty": "On duty",
} as const;

export type CatalogKey = keyof typeof en;

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
  "quota.remaining": "{minutes} minutes remaining",
  "status.break": "Break",
  "status.offDuty": "Off duty",
  "status.onDuty": "On duty",
} as const;

export type CatalogKey = keyof typeof en;

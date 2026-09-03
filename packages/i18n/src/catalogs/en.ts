export const en = {
  "access.allowanceExhausted": "Your distraction allowance is exhausted",
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

import type { CatalogKey } from "./en";

export const fr = {
  "access.allowanceExhausted": "Votre quota de distraction est épuisé",
  "access.blockedBody": "Ce site est bloqué pendant votre plage de travail.",
  "access.blockedTitle": "Quota de distraction épuisé",
  "access.warningBody": "Reprenez votre travail avant que l’accès soit bloqué.",
  "access.warningTitle": "Quota de distraction presque épuisé",
  "action.activate": "Activer Productivity Police",
  "app.name": "Productivity Police",
  "error.storageUnavailable":
    "Les données locales sont temporairement indisponibles",
  "nav.activity": "Activité",
  "nav.dashboard": "Tableau de bord",
  "nav.integrations": "Intégrations",
  "nav.settings": "Paramètres",
  "quota.remaining": "{minutes} minutes restantes",
  "status.break": "Pause",
  "status.offDuty": "Hors service",
  "status.onDuty": "En service",
} as const satisfies Record<CatalogKey, string>;

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
  "override.error": "L’exception n’a pas pu être accordée. Réessayez.",
  "override.firstBody":
    "Confirmez que vous comprenez que ce temps compte dans votre engagement.",
  "override.firstConfirm": "Je comprends",
  "override.firstTitle": "Avez-vous besoin d’y accéder maintenant ?",
  "override.justificationLabel": "Pourquoi cet accès est-il nécessaire ?",
  "override.justificationPlaceholder":
    "Donnez une raison professionnelle précise",
  "override.request": "Demander une exception",
  "override.secondBody":
    "Cette exception ne vaut que pour cet onglet et sera enregistrée.",
  "override.secondConfirm": "Continuer quand même",
  "override.secondTitle": "Êtes-vous sûr ?",
  "override.submit": "Débloquer cet onglet",
  "quota.remaining": "{minutes} minutes restantes",
  "status.break": "Pause",
  "status.offDuty": "Hors service",
  "status.onDuty": "En service",
} as const satisfies Record<CatalogKey, string>;

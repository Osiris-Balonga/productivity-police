# Productivity Police

Modèle de données local — V1

Productivity Police • V1.2 • 03 septembre 2026

## 1. Objectif

Définir les structures persistées dans chrome.storage.local et les données éphémères nécessaires au runtime, sans transformer le schéma local en base relationnelle artificielle.

## 2. Racine de stockage

StorageEnvelope { schemaVersion, settings, websiteRules, usageByDate, activity, reports, integrations }

## 3. Structures

| Objet | Schéma conceptuel | Cycle de vie |
| --- | --- | --- |
| Settings | { enabled:boolean, locale:"fr"\|"en", universe:"student"\|"pro", dailyAllowanceMinutes:number, schedule:WorkSchedule } | Persisté |
| WorkSchedule | { days: { weekday, enabled, periods:[{start,end}] }[] } | Persisté |
| WebsiteRule | { id, name, domain, list:"blacklist"\|"whitelist", createdAt } | Persisté |
| DailyUsage | { localDate, usedSeconds, bySiteSeconds:{siteId:seconds}, warningTriggered:boolean, exhaustedTriggered:boolean } | Persisté dans usageByDate ; 90 jours minimum |
| ActivityEvent | { id, type, occurredAt, siteId?, tabId?, metadata? } | Persisté 90 jours |
| WeeklyReportSnapshot | { id, periodStart, periodEnd, universe, distractionSeconds, allowanceSeconds, configuredDays, daysWithinAllowance, warningCount, blockedCount, overrideCount, siteBreakdown, overrideEntries:[{occurredAt,siteId,justification}], createdAt } | Persisté sans purge auto |
| IntegrationConfig | { provider, connected, accountRef, lastSyncedAt, status, scopes } | Persisté |
| IntegrationCache | { provider, tasks:[ExternalTask], lastSyncedAt, lastSuccessAt, errorCode? } | Persisté |
| ExternalTask | { id, title, url, priority?, source } | Cache seulement |
| TabOverride | { tabId, siteId, canonicalDomain, justification, grantedAt } | chrome.storage.session ; validé au réveil ; supprimé à fermeture/navigation hors site |
| DistractionClockState | { activeTabId?, siteId?, startedAt?, lastAccountedAt? } | chrome.storage.session ; une seule session active |
| IntegrationCredential | { provider, accessToken, refreshToken?, expiresAt?, accountRef, scopes } | Local sensible ; exclu des logs, Activity, rapports et exports |

## 4. Indexation logique

- WebsiteRule indexé en mémoire par domaine normalisé.
- ActivityEvent consulté par occurredAt et type.
- WeeklyReportSnapshot ordonné par periodEnd.
- IntegrationCache indexé par provider.
- TabOverride indexé par tabId.
## 5. Migration

1. Lire schemaVersion.
2. Exécuter migrate(vN→vN+1) séquentiellement.
3. Tester l’idempotence de chaque migration.
4. Valider le résultat avant d’écrire la nouvelle version.
5. Ne jamais supprimer silencieusement un champ non migré.
## 6. Vie privée

- Ne pas stocker l’URL complète des pages visitées lorsque le domaine/siteId suffit.
- Ne pas stocker le contenu des pages.
- Ne stocker des tâches externes que ce qui est nécessaire à l’affichage read-only.
- Les justifications d’override restent locales.
- Prévoir Delete activity history et Reset all data.
## 7. Contraintes de stockage V1.2

- usageByDate est indexé par date locale ISO YYYY-MM-DD ; un changement de fuseau ne réécrit aucune entrée existante.
- Les créations de WeeklyReportSnapshot sont atomiques et dédupliquées par periodStart/periodEnd.
- TabOverride et DistractionClockState utilisent chrome.storage.session afin de survivre à la suspension du service worker sans survivre à la session navigateur.
- Au réveil, tout état de session est validé contre les onglets et domaines réellement ouverts avant utilisation.
- La déconnexion d’un provider supprime IntegrationCredential, IntegrationConfig et IntegrationCache pour ce provider.
- Reset all data efface chrome.storage.local et chrome.storage.session, puis laisse une enveloppe non configurée explicitement versionnée.

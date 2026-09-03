# Productivity Police

Modèle de domaine — contrat métier pour TDD

Productivity Police • V1.2 • 03 septembre 2026

## 1. Concepts principaux

- UserSettings : enabled, universe, locale, dailyAllowance, schedule.
- WorkSchedule : jours et plages de travail.
- WebsiteRuleSet : Blacklist/Whitelist.
- DailyDistraction : cumul quotidien.
- TabOverride : permission exceptionnelle {tabId, siteId, justification, grantedAt}.
- AccessDecision : ALLOW/TRACK/WARN/BLOCK + reason.
- DialogueContext : contexte de sélection de message.
- ExternalTask : tâche normalisée assignée.
- IntegrationCache : tâches + lastSyncedAt + état.
- ActivityEvent : événement horodaté.
- WeeklyReportSnapshot : snapshot immuable.
- StorageEnvelope : schemaVersion + données persistées.
## 2. Invariants

1. Whitelist gagne toujours sur Blacklist.
2. OFF_DUTY/BREAK ne consomment pas le quota.
3. Le quota est global et cumulatif sur tous les sites blacklistés.
4. À quota zéro, tout onglet blacklisté sans override valide est bloqué immédiatement.
5. Un TabOverride ne vaut que pour le tabId et le site associés et disparaît à fermeture de l’onglet.
6. Changer horaires, fuseau, univers ou langue ne réécrit jamais le passé.
7. Changer de langue ou d’univers ne change aucune AccessDecision.
8. Une panne d’intégration ne modifie jamais Enforcement.
9. Un WeeklyReportSnapshot est immuable.
10. Une migration ne doit pas supprimer silencieusement les données.
## 3. LocalePolicy

- SUPPORTED_LOCALES = [fr, en].
- Fallback = en.
- Initiale = langue navigateur si supportée, sinon en.
- Changement instantané.
- Les clés de dialogue sont stables entre locales.
- Aucun texte traduit n’est stocké dans Activity ou les snapshots.
## 4. TimePolicy

- Fuseau = système.
- DST = système.
- État recalculé si fuseau change.
- Historique non recalculé.
- Jour de remise à zéro du quota déterminé dans le temps local courant.
## 5. RetentionPolicy

- ActivityEvent détaillé : 90 jours.
- WeeklyReportSnapshot : pas de purge automatique V1.
- IntegrationCache : dernière valeur valide par provider.
- Reset global et suppression d’historique sont deux actions distinctes.
## 6. SyncPolicy

- Auto refresh : toutes les 5 minutes.
- Refresh manuel autorisé.
- Cache valide conservé sur erreur.
- Sans cache et sur erreur : tasks = indisponibles, moteur local inchangé.
## 7. Événements métier

- WORK_PERIOD_STARTED / WORK_PERIOD_ENDED / BREAK_STARTED / BREAK_ENDED
- DISTRACTION_STARTED / DISTRACTION_STOPPED / WARNING_TRIGGERED / ALLOWANCE_EXHAUSTED
- WEBSITE_BLOCKED / OVERRIDE_REQUESTED / OVERRIDE_GRANTED / OVERRIDE_EXPIRED
- UNIVERSE_CHANGED / LOCALE_CHANGED / TIMEZONE_CHANGED
- INTEGRATION_SYNC_SUCCEEDED / INTEGRATION_SYNC_FAILED
- WEEKLY_PERIOD_COMPLETED / ACTIVITY_RETENTION_PURGED / STORAGE_MIGRATED
## 8. Politiques complémentaires V1.2

### 8.1 DistractionClockPolicy

- DistractionClockState : {activeTabId?, siteId?, startedAt?, lastAccountedAt?} ; une seule session globale active.
- shouldCount = enabled && ON_DUTY && BLACKLIST && !WHITELIST && !override && activeTab && focusedWindow && !idle.
- Toute transition consolide max(0, now - lastAccountedAt) dans la date locale observée ; aucune durée non observée pendant une suspension n’est inventée.
- WARNING_TRIGGERED est unique par localDate au franchissement de 80 % ; ALLOWANCE_EXHAUSTED est unique au franchissement de 100 %.
### 8.2 SchedulePolicy

- Une plage est [start, end), avec start < end dans la même date locale.
- Deux plages d’un même jour ne peuvent ni se chevaucher ni être dupliquées ; les plages adjacentes sont autorisées.
- Les plages traversant minuit sont hors périmètre V1.
### 8.3 WebsiteIdentityPolicy

- CanonicalDomain retire schéma, authentification, chemin, requête, fragment, port, point final et préfixe www, puis applique lowercase et IDNA ASCII.
- Une règle matche le domaine canonique exact ou un sous-domaine séparé par un point.
- Une navigation hors du domaine autorisé invalide immédiatement le TabOverride.
### 8.4 ReportingPolicy

- ReportPeriod : lundi 00:00 inclus → lundi suivant 00:00 exclu, dans le fuseau système courant.
- Un snapshot est identifié de manière unique par periodStart/periodEnd et sa création est idempotente.
- Le snapshot contient les métriques agrégées et les entrées d’override nécessaires au rapport, y compris la justification locale.
### 8.5 FailurePolicy

- Sur erreur de lecture, le dernier état valide en mémoire reste utilisable.
- Sans état valide, Enforcement est suspendu, AccessDecision = ALLOW avec reason STORAGE_UNAVAILABLE et une erreur persistante est présentée.
- Aucune erreur ne peut provoquer une réinitialisation silencieuse des données.

# Productivity Police

Architecture technique — DDD léger, TDD strict et i18n native

Productivity Police • V1.2 • 03 septembre 2026

## 1. Principes

- Le domaine décide, Chrome exécute, l’UI affiche.
- DDD léger : modules par domaine, pas de cérémonial inutile.
- TDD strict : tout nouveau comportement métier commence par un test.
- Local-first et storage versionné.
- Aucun texte utilisateur dans le domaine.
- Les intégrations sont optionnelles et non critiques.
## 2. Monorepo

apps/extension/{background,content,popup,dashboard,manifest} packages/{domain,integrations,i18n,storage,shared,ui} tests/{integration,e2e} docs/

Le moteur de rendu documentaire Docn UI reste une dépendance externe, isolée derrière un adapter de packages/reporting-export. Sa version et sa licence doivent être figées avant PP-026 ; aucune règle métier ni donnée persistée ne dépend de son API.

## 3. Domaines

- Schedule
- Websites
- Distraction
- Enforcement
- Universe
- Dialogue
- Activity
- Integrations
- Reporting
- Settings
## 4. Rule Engine

Entrée : heure courante, site, planning, usage quotidien, quota, activation et override éventuel lié au tabId. Sortie : AccessDecision immuable (ALLOW/TRACK/WARN/BLOCK + reason). Priorité : disabled → tab override valide → Whitelist → Schedule → Blacklist → quota.

## 5. Runtime Chrome

- Background service worker : orchestrateur, alarms/tabs/messages/settings, synchronisation des intégrations, migrations de stockage.
- Content scripts : rendu warning/blocker/mascotte/tâches uniquement.
- Dashboard/popup : view models, aucune duplication de règles métier.
## 6. Internationalisation

- Locales V1 : fr, en ; fallback : en.
- Résolution initiale via langue du navigateur.
- Locale modifiable à chaud depuis Settings.
- Le domaine retourne messageKey + params, jamais un texte final.
- Dialogue anti-répétition basé sur IDs de variantes.
- Intl pour date/heure/nombre avec fuseau du système.
- Catalogues séparés par locale et validation automatique de parité des clés en CI.
## 7. Temps

Le domaine reçoit un instant et un TimeZoneContext issu du système. Aucun fuseau configurable en V1. Le changement de fuseau déclenche une réévaluation de l’état, jamais une réécriture rétroactive.

## 8. Storage et migrations

- Repositories : Settings, Usage, Activity, Reports, IntegrationCache, Overrides.
- chrome.storage.local caché derrière des adapters ; MemoryRepository en tests.
- Root schemaVersion obligatoire.
- Migrations séquentielles, idempotentes et testées.
- Activity détaillée : rétention 90 jours.
- Reports : conservation sans limite V1.
- Override : état éphémère lié à tabId, nettoyé à fermeture d’onglet.
## 9. Intégrations et cache

Contrat commun TaskProvider : getAssignedTasks(), getAssignedTasksUrl(), refresh(). Une tâche normalisée : id, title, url, priority, source. Chaque provider conserve un cache local {tasks,lastSyncedAt,status}. Refresh automatique toutes les 5 minutes + manuel. En erreur, le cache reste exploitable.

## 10. Reporting

WeeklyReportSnapshot est une donnée immuable. Le rendu PDF/PNG est à la demande. L’univers est figé dans le snapshot ; la langue est une préférence de rendu et peut donc être celle active au moment de l’export.

## 11. Tests

- Domain tests majoritaires : fonctions pures, repositories mémoire.
- Integration tests : Chrome adapters, storage migrations, providers HTTP mockés, catalogues i18n.
- E2E : extension chargée dans Chromium pour parcours critiques.
- CI : tests, lint, parité des clés i18n, migrations et quelques E2E smoke.
## 12. Décisions d’exécution V1.2

### 12.1 Horloge de distraction

- Le background observe tabs.onActivated, tabs.onUpdated, tabs.onRemoved, windows.onFocusChanged, idle.onStateChanged, webNavigation et les alarmes de planning.
- Le temps est comptabilisé aux transitions avec un instant monotone fourni au domaine. Un heartbeat consolide l’état mais ne sert pas de source unique de vérité.
- Le domaine garantit une seule DistractionClockState active ; le runtime ne somme jamais plusieurs onglets.
- Au réveil du service worker, la durée depuis lastAccountedAt n’est pas créditée si elle n’a pas été observée de façon fiable.
### 12.2 Stockage de session et navigation

- chrome.storage.local contient les données durables ; chrome.storage.session contient TabOverride et DistractionClockState.
- Chaque réveil revalide tabId, URL et domaine canonique. Une navigation hors du domaine autorisé supprime l’override avant l’évaluation suivante.
- Les écritures de snapshot et migrations utilisent une validation avant commit ; la version n’avance qu’après écriture complète.
### 12.3 Authentification des providers

- Un AuthAdapter par provider encapsule OAuth, scopes minimaux de lecture, pagination, expiration, refresh et révocation.
- Les credentials sont séparés des caches métier et ne transitent jamais dans les messages destinés aux content scripts.
- Les erreurs sont classées NETWORK_ERROR, AUTH_EXPIRED, RATE_LIMITED et PROVIDER_ERROR afin de piloter le statut sans affecter Enforcement.
### 12.4 Reporting et rattrapage

- ReportScheduler calcule les périodes lundi-lundi et recherche au démarrage les périodes closes non matérialisées.
- ReportRepository impose l’unicité periodStart/periodEnd pour garantir l’idempotence.
- Docn UI reçoit uniquement un ReportViewModel localisé ; les exports ne contiennent jamais credentials ni métadonnées techniques.
### 12.5 Politique d’échec

- Une erreur de stockage conserve le dernier état valide en mémoire. Sans état valide, le runtime passe en fail-open explicite et affiche STORAGE_UNAVAILABLE.
- Le reset global arrête les alarmes et compteurs, vide les deux stockages, réévalue les onglets et relance l’onboarding.

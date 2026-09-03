# Productivity Police

Backlog de développement — découpage par responsabilité

Productivity Police • V1.2 • 03 septembre 2026

## 1. Règle de découpage

Chaque ticket doit avoir une responsabilité métier limitée, des critères d’acceptation reliés à des IDs de la matrice TDD et ne pas mélanger domaine pur, infrastructure et polish UI sauf nécessité explicite.

## 2. Backlog

| Ticket | Domaine | Livrable | Critères / tests | Prio |
| --- | --- | --- | --- | --- |
| PP-001 | Foundation | Initialiser monorepo extension + packages + tests + CI | Structure buildable ; scripts test/lint ; aucune feature métier. | P0 |
| PP-002 | i18n | Mettre en place fr/en + fallback en + détection navigateur | I18N-01/02/03/05/06 | P0 |
| PP-003 | Storage | Repositories mémoire + Chrome + schemaVersion | MIG-01 | P0 |
| PP-004 | Schedule | Implémenter WorkSchedule multi-plages + états | SCH-01/02/03 | P0 |
| PP-005 | Time | Fuseau système + recalcul timezone | SCH-05/06 | P0 |
| PP-006 | Websites | WebsiteRuleSet + whitelist priorité + normalisation domaine | WEB-01/02/03 | P0 |
| PP-007 | Distraction | DailyDistraction cumulatif + reset local | ENF-09/10/11 | P0 |
| PP-008 | Enforcement | Rule Engine + ordre de priorité | ENF-01..07 | P0 |
| PP-009 | Chrome | Background orchestrator + tabs/alarms/messages | ENF-08, E2E-06 | P0 |
| PP-010 | UI | Content script warning + blocker shell | ENF-06/17, E2E-01 | P0 |
| PP-011 | Universe | Student/Pro themes + Experience Engine | UNI-01 | P1 |
| PP-012 | Dialogue | Dialogue Engine contextuel + anti-répétition + i18n keys | I18N-07/08 | P1 |
| PP-013 | Override | Workflow 2 confirmations + justification + tab lifecycle | OVR-01..07, E2E-02/03 | P0 |
| PP-014 | Dashboard | Dashboard Student/Pro + Activity shell | UI-02 | P1 |
| PP-015 | Popup | Popup mascotte/statut/quota + dashboard link | UI-01/03 ; rendu univers/locale | P1 |
| PP-016 | Settings | Planning, quota, univers, langue, sites ; application immédiate | SCH-04, WEB-04, I18N-04 | P0 |
| PP-017 | Integrations | TaskProvider core + modèles/cache | INT-05/06/07/08 | P1 |
| PP-018 | GitHub | Adapter read-only assigned issues | INT-01 | P1 |
| PP-019 | Jira | Adapter read-only assigned tickets | INT-02 | P1 |
| PP-020 | Linear | Adapter read-only assigned issues | INT-03 | P1 |
| PP-021 | Sync | Auto 5 min + refresh manuel + stale status | INT-09/10 | P1 |
| PP-022 | Block tasks | Affichage multi-provider : compteur + 1 tâche/service | INT-04 | P1 |
| PP-023 | Reporting | WeeklyReportSnapshot immuable | REP-01/02/03 | P1 |
| PP-024 | Retention | Purge Activity 90j + delete history + reset all | RET-01..04 | P1 |
| PP-025 | Migrations | Pipeline migrations idempotentes | MIG-02/03/04 | P0 |
| PP-026 | Docn UI | Template bulletin Student + performance review Pro | REP-04 ; templates localisés sans logique métier | P1 |
| PP-027 | Export | Export PDF/PNG à la demande | REP-05 ; génération de fichier uniquement | P1 |
| PP-028 | E2E | Suite E2E critique Chromium | E2E-01..08 | P0 |
| PP-029 | Hardening | Offline/API errors/storage errors/cleanup | HARD-01/02 + scénarios d’échec propres aux features | P0 |
| PP-030 | Release | Manifest, permissions minimales, packaging, QA finale | Gate P0 du cœur vert ; gates P1 des features incluses verts | P0 |
| PP-031 | Distraction | Clock runtime actif/focus/idle sans double comptage | ENF-12..16, E2E-07 | P0 |
| PP-032 | Schedule | Validation bornes, chevauchements et minuit | SCH-07..09 | P0 |
| PP-033 | Websites | CanonicalDomain + matching sous-domaines sûr | WEB-05/06 | P0 |
| PP-034 | Enforcement | Warning unique au seuil de 80 % | ENF-17 | P0 |
| PP-035 | Override | Persistance session + invalidation navigation | OVR-08/09, E2E-08 | P0 |
| PP-036 | Integrations | OAuth minimal, pagination, expiration et déconnexion | INT-11..14 | P1 |
| PP-037 | Reporting | Métriques normatives + rattrapage idempotent | REP-06..09, E2E-09 | P1 |
| PP-038 | Retention | Cleanup planifié + reset runtime complet | RET-05/06 | P1 |

## 3. Ordre recommandé

PP-001 → 002/003/025 → 004/005/006/007/031/032/033 → 008/034 → 009/010/035 → 011/012/013 → 014/015/016 → 017/036 → 018/019/020/021/022 → 023/037 → 024/038 → 026/027 → 028/029 → 030.

## 4. Règles d’implémentation

- Lire le PRD, le workflow concerné et le modèle de domaine avant de coder.
- Identifier les IDs TDD du ticket et écrire les tests rouges en premier.
- Ne pas ajouter de feature hors critères d’acceptation.
- Ne pas déplacer une règle métier vers Chrome/UI pour faire passer un test.
- Si une ambiguïté apparaît, la traiter comme une divergence de spécification et non comme une permission d’inventer.
## 5. Definition of Ready V1.2

- Un ticket métier n’est Ready que si ses règles, cas limites, données d’entrée/sortie et IDs TDD sont explicites.
- P0 protège le cœur Schedule/Websites/Distraction/Enforcement/Override, le stockage sûr, l’i18n de base et les parcours E2E critiques.
- P1 protège les univers, le polish UI, les intégrations, les rapports et la rétention ; une feature P1 n’est terminée que lorsque ses tests P1 sont verts.
- Les tests E2E sont ajoutés au fil des tickets ; PP-028 consolide le harness et la suite complète, il ne reporte pas les tests à la fin.
- PP-026 ne construit que les ReportViewModel/templates ; PP-027 ne construit que l’adapter d’export PDF/PNG.

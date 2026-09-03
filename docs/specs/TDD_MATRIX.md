# Productivity Police

Matrice de tests TDD — comportements à implémenter test-first

Productivity Police • V1.2 • 03 septembre 2026

## 1. Règle d’utilisation

Chaque ligne P0/P1 devient un test avant son implémentation. RED → GREEN → REFACTOR. Les tests Domain doivent s’exécuter sans Chrome ; Integration/E2E couvrent les adapters et le runtime.

## 2. Matrice

| ID | Domaine | Given | When | Then | Niveau | Prio |
| --- | --- | --- | --- | --- | --- | --- |
| SCH-01 | Schedule | Lundi 09:00-12:00 | 09:30 local | ON_DUTY | Unit | P0 |
| SCH-02 | Schedule | 09:00-12:00 + 14:00-18:00 | 13:00 local | BREAK | Unit | P0 |
| SCH-03 | Schedule | Lundi travaillé | 20:00 local | OFF_DUTY | Unit | P0 |
| SCH-04 | Schedule | Horaire modifié pendant la journée | Sauvegarde settings | État courant recalculé, historique intact | Unit | P0 |
| SCH-05 | Schedule | Fuseau système change | TIMEZONE_CHANGED | État courant recalculé, historique intact | Unit | P0 |
| SCH-06 | Schedule | Passage DST géré par OS | Heure locale évaluée | État suit l’heure système | Unit | P0 |
| WEB-01 | Websites | Site blacklisté | Résolution domaine | BLACKLIST | Unit | P0 |
| WEB-02 | Websites | Même domaine dans whitelist + blacklist | Résolution | WHITELIST gagne | Unit | P0 |
| WEB-03 | Websites | Site absent des listes | Résolution | NEUTRAL | Unit | P0 |
| WEB-04 | Websites | Ajout site pendant ON_DUTY | Sauvegarde règle | Onglet concerné réévalué immédiatement | Integration | P0 |
| ENF-01 | Enforcement | Extension disabled + site blacklisté | Evaluate | ALLOW | Unit | P0 |
| ENF-02 | Enforcement | Whitelist + quota zéro | Evaluate | ALLOW | Unit | P0 |
| ENF-03 | Enforcement | Blacklist + OFF_DUTY | Evaluate | ALLOW | Unit | P0 |
| ENF-04 | Enforcement | Blacklist + BREAK | Evaluate | ALLOW | Unit | P0 |
| ENF-05 | Enforcement | Blacklist + ON_DUTY + quota dispo | Evaluate | TRACK | Unit | P0 |
| ENF-06 | Enforcement | Quota proche seuil | Evaluate | WARN | Unit | P0 |
| ENF-07 | Enforcement | Quota zéro | Evaluate | BLOCK | Unit | P0 |
| ENF-08 | Enforcement | Onglet déjà ouvert quand quota atteint zéro | Événement quota | BLOCK envoyé immédiatement | Integration | P0 |
| ENF-09 | Distraction | 10 min YouTube + 5 min X | Cumul | 15 min utilisées | Unit | P0 |
| ENF-10 | Distraction | Session quittée puis reprise | Nouvelle session | Cumul précédent conservé | Unit | P0 |
| ENF-11 | Distraction | Nouveau jour local | Reset journalier | usedSeconds=0 | Unit | P0 |
| OVR-01 | Override | Site bloqué | 1re confirmation seulement | Toujours bloqué | Unit | P0 |
| OVR-02 | Override | 2 confirmations sans justification | Validation | Refus / validation impossible | Unit | P0 |
| OVR-03 | Override | 2 confirmations + justification | Validation | Override accordé au tabId/siteId | Unit | P0 |
| OVR-04 | Override | Override tab A | Ouvrir même site tab B | Tab B reste bloqué | Unit | P0 |
| OVR-05 | Override | Override actif tab A | Fermer tab A | Override supprimé | Integration | P0 |
| OVR-06 | Override | Override accordé | Contrôle quota | Quota reste épuisé | Unit | P0 |
| OVR-07 | Override | Plusieurs overrides journée | Nouvelle demande | Pas de plafond ; chaque événement loggé | Unit | P0 |
| I18N-01 | i18n | Navigator=fr-FR | Premier lancement | locale=fr | Unit | P0 |
| I18N-02 | i18n | Navigator=en-US | Premier lancement | locale=en | Unit | P0 |
| I18N-03 | i18n | Navigator=de-DE | Premier lancement | fallback en | Unit | P0 |
| I18N-04 | i18n | Locale fr active | Changer vers en | UI re-rendue sans reset métier | Integration | P0 |
| I18N-05 | i18n | Même contexte métier fr/en | Evaluate | Même AccessDecision | Unit | P0 |
| I18N-06 | i18n | Catalogues fr/en | CI validation | Même ensemble de clés | Integration | P0 |
| I18N-07 | Dialogue | Message récent déjà utilisé | Sélection suivante | Variante compatible différente si disponible | Unit | P1 |
| I18N-08 | Dialogue | 5e blocage | Sélection | Variante de sévérité/occurrence adaptée | Unit | P1 |
| INT-01 | Integrations | GitHub connecté | Refresh | Uniquement issues assignées normalisées | Integration | P1 |
| INT-02 | Integrations | Jira connecté | Refresh | Uniquement tickets assignés normalisés | Integration | P1 |
| INT-03 | Integrations | Linear connecté | Refresh | Uniquement issues assignées normalisées | Integration | P1 |
| INT-04 | Integrations | 3 providers connectés | Block screen | Services séparés, 1 tâche max chacun | Unit | P1 |
| INT-05 | Integrations | API réussit | Refresh | Cache remplacé + lastSyncedAt | Unit | P1 |
| INT-06 | Integrations | API échoue + cache existe | Refresh | Cache conservé + stale status | Unit | P1 |
| INT-07 | Integrations | API échoue sans cache | Block screen | Aucune tâche, mascotte standard | Unit | P1 |
| INT-08 | Integrations | Provider en erreur | Enforcement evaluate | Blocage local fonctionne | Unit | P1 |
| INT-09 | Integrations | 5 min écoulées | Scheduler | Refresh automatique déclenché | Integration | P1 |
| INT-10 | Integrations | Bouton Refresh | Click | Refresh immédiat | E2E | P1 |
| REP-01 | Reporting | Fin période | Close period | Snapshot créé | Unit | P1 |
| REP-02 | Reporting | Snapshot clôturé | Changer univers | Snapshot inchangé | Unit | P1 |
| REP-03 | Reporting | Snapshot clôturé | Changer langue | Données snapshot inchangées | Unit | P1 |
| REP-04 | Reporting | Rapport existant | Export en fr puis en | Même métriques, textes localisés | Integration | P1 |
| REP-05 | Reporting | Export demandé | PDF/PNG | Fichier généré à la demande seulement | Integration | P1 |
| RET-01 | Retention | Activity >90 jours | Cleanup | Événements anciens purgés | Unit | P1 |
| RET-02 | Retention | Snapshots anciens | Cleanup | Aucun snapshot supprimé | Unit | P1 |
| RET-03 | Retention | Delete activity history | Confirmer | Activity supprimée, settings/reports conservés | Unit | P1 |
| RET-04 | Retention | Reset all data | Confirmer | Toutes données locales supprimées | Unit | P1 |
| MIG-01 | Storage | schemaVersion courant | Startup | Aucune migration | Unit | P0 |
| MIG-02 | Storage | schemaVersion ancien | Startup | Migrations séquentielles appliquées | Unit | P0 |
| MIG-03 | Storage | Migration déjà appliquée | Rejouer | Résultat identique | Unit | P0 |
| MIG-04 | Storage | Migration échoue | Startup | Version non avancée, données d’origine préservées | Unit | P0 |
| E2E-01 | Critical path | Quota zéro + YouTube blacklisté | Ouvrir YouTube | Blocker visible immédiatement | E2E | P0 |
| E2E-02 | Critical path | Blocker visible | Override complet | Site accessible dans même onglet | E2E | P0 |
| E2E-03 | Critical path | Override actif | Fermer puis rouvrir site | Nouveau tab bloqué | E2E | P0 |
| E2E-04 | Critical path | Langue fr | Passer en en | Blocker/dashboard/popup en anglais | E2E | P0 |
| E2E-05 | Critical path | Pause entre plages | Visiter blacklist | Pas de blocker, pas de consommation quota | E2E | P0 |
| E2E-06 | Critical path | Onglet blacklisté ouvert avant début plage | Début plage | Blocage/règle appliquée sans reload | E2E | P0 |
| SCH-07 | Schedule | Plage 09:00-12:00 | Évaluer à 09:00 puis 12:00 | ON_DUTY puis hors plage | Unit | P0 |
| SCH-08 | Schedule | Deux plages se chevauchent | Sauvegarder | Validation refusée | Unit | P0 |
| SCH-09 | Schedule | Plage traverse minuit | Sauvegarder | Validation refusée en V1 | Unit | P0 |
| WEB-05 | Websites | URL HTTPS avec www, port et chemin | Normaliser | Domaine canonique attendu | Unit | P0 |
| WEB-06 | Websites | Règle example.com | Tester sous-domaine et notexample.com | Sous-domaine match ; faux suffixe non | Unit | P0 |
| ENF-12 | Distraction | Onglet blacklisté actif, fenêtre focus, user active | Temps passe | Quota augmente | Unit | P0 |
| ENF-13 | Distraction | Onglet blacklisté en arrière-plan | Temps passe | Quota inchangé | Unit | P0 |
| ENF-14 | Distraction | Plusieurs onglets blacklistés ouverts | Un seul est actif | Aucun double comptage | Unit | P0 |
| ENF-15 | Distraction | User idle ou fenêtre Chrome non focus | Temps passe | Quota inchangé | Unit | P0 |
| ENF-16 | Distraction | Service worker suspendu | Réveil | Durée non observée non créditée | Integration | P0 |
| ENF-17 | Enforcement | Consommation passe de 79 % à 80 % | Consolider | Un seul warning par date locale | Unit | P0 |
| OVR-08 | Override | Override actif | Naviguer hors du domaine | Override supprimé et blocage réévalué | Integration | P0 |
| OVR-09 | Override | Override en storage.session | Worker redémarre | Restauré seulement si tab/site valides | Integration | P0 |
| UNI-01 | Universe | Même contexte Student/Pro | Evaluate | Même AccessDecision | Unit | P1 |
| UI-01 | Popup | État BREAK | Ouvrir popup | BREAK affiché et quota non consommé | E2E | P1 |
| UI-02 | Dashboard | Repositories alimentés | Afficher dashboard/activity | View models issus des repositories | Integration | P1 |
| UI-03 | UI | Locale change | Re-rendre toutes surfaces | Aucune règle métier réinitialisée | E2E | P1 |
| INT-11 | Integrations | Provider connecté | Déconnecter | Révocation tentée puis credentials/cache supprimés | Integration | P1 |
| INT-12 | Integrations | Token expiré | Refresh | AUTH_EXPIRED et reconnexion demandée | Integration | P1 |
| INT-13 | Integrations | Résultats paginés | Refresh | Toutes tâches assignées normalisées | Integration | P1 |
| INT-14 | Integrations | Connexion OAuth | Autoriser | Scopes read-only minimaux | Integration | P1 |
| REP-06 | Reporting | Semaine clôturée | Calculer | Métriques normatives exactes | Unit | P1 |
| REP-07 | Reporting | Overrides avec justification | Créer snapshot | Entrées conservées localement dans le snapshot | Unit | P1 |
| REP-08 | Reporting | Chrome fermé à la clôture | Redémarrer | Snapshot manquant créé une seule fois | Integration | P1 |
| REP-09 | Reporting | Fuseau système | Calcul période | Lundi inclus à lundi exclu | Unit | P1 |
| RET-05 | Retention | Reset all data confirmé | Exécuter | Local/session vidés, compteurs arrêtés, onglets réévalués | Integration | P1 |
| RET-06 | Retention | Démarrage ou entretien quotidien | Cleanup | Purge 90 jours exécutée idempotemment | Unit | P1 |
| HARD-01 | Hardening | Lecture storage échoue + état mémoire valide | Evaluate | Dernier état valide utilisé et erreur affichée | Integration | P0 |
| HARD-02 | Hardening | Aucun état valide disponible | Evaluate | ALLOW/STORAGE_UNAVAILABLE sans reset silencieux | Integration | P0 |
| E2E-07 | Critical path | Deux onglets blacklistés | Alterner focus pendant 2 min | Environ 2 min, jamais 4 min, consommées | E2E | P0 |
| E2E-08 | Critical path | Override actif | Suspendre/réveiller worker puis naviguer | Persiste sur même site, expire hors site | E2E | P0 |
| E2E-09 | Reporting | Clôture manquée | Relancer extension deux fois | Un seul snapshot créé | E2E | P1 |

## 3. Gate de livraison

- Aucun comportement P0 ne peut entrer dans la release du cœur Enforcement sans test automatisé vert.
- Tous les tests Domain doivent passer sans navigateur.
- Les migrations et catalogues i18n sont validés en CI.
- Les E2E critiques doivent être verts avant release.
- Les tests P1 deviennent obligatoires avant la clôture du ticket ou de la feature V1 correspondante ; ils ne bloquent pas une livraison interne limitée au cœur Enforcement.
- Toute nouvelle ambiguïté métier doit recevoir un ID de test et une décision normative avant implémentation.

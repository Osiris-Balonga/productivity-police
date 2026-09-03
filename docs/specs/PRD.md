# Productivity Police

Product Requirements Document — MVP consolidé

Productivity Police • V1.2 • 03 septembre 2026

## 1. Vision

Productivity Police est une extension Chrome local-first qui aide l’utilisateur à respecter les plages de travail qu’il s’est lui-même définies. Elle contrôle l’accès aux sites distrayants via une Blacklist/Whitelist et un quota global quotidien, tout en transformant la discipline en expérience personnifiée par des univers et mascottes.

La promesse produit reste simple : faire respecter des règles choisies par l’utilisateur sans devenir un gestionnaire de tâches, un outil de surveillance d’employés ou un assistant IA coûteux.

## 2. Univers V1

| Univers | Mascotte | Direction artistique | Rapport |
| --- | --- | --- | --- |
| Student | Professor | Noir et blanc, éditorial, esprit cahier / Notion | Weekly Report Card / bulletin |
| Pro | Manager | Blanc + bleu corporate, dense et data, esprit Jira / Atlassian | Weekly Performance Review |

L’univers change la DA, la mascotte, le vocabulaire, les messages et le format du rapport, mais jamais les règles métier. Il peut être changé à tout moment. Les rapports clôturés conservent l’univers avec lequel ils ont été générés.

## 3. Internationalisation V1

- Langues de lancement : français et anglais.
- Au premier lancement, la langue est détectée depuis la langue du navigateur. Si elle n’est pas prise en charge, l’anglais est utilisé par défaut.
- La langue peut être changée à tout moment dans Settings, sans redémarrage.
- Changer de langue ne modifie aucune donnée métier, statistique, règle, quota ou rapport déjà clôturé.
- Toutes les surfaces sont traduisibles : onboarding, dashboard, popup, blocker, settings, messages de mascotte, erreurs et rapports.
- Les titres de tâches externes et les noms personnalisés de sites restent tels que fournis par l’utilisateur ou le service source.
## 4. Onboarding

1. Welcome et choix automatique de langue, modifiable immédiatement.
2. Choix de l’univers Student ou Pro.
3. Définition des jours et d’une ou plusieurs plages de travail par jour.
4. Définition du quota quotidien global de distraction.
5. Configuration de la Blacklist via liste de sites populaires/autocomplétion ou ajout manuel nom + URL/domaine.
6. Configuration de la Whitelist.
7. Connexion optionnelle de GitHub Issues, Jira et Linear.
8. Récapitulatif des règles et aperçu factice du rapport hebdomadaire.
9. Activation explicite via « Activate Productivity Police ».
10. Message final de la mascotte puis ouverture du dashboard.
## 5. Horaires et temps

- États : ON_DUTY, BREAK, OFF_DUTY.
- Plusieurs plages par jour sont supportées dès la V1.
- Le fuseau horaire du système est utilisé ; aucune configuration de fuseau dédiée en V1.
- Si le fuseau système change, l’état est recalculé immédiatement.
- Les changements heure été/hiver sont laissés au système.
- Une modification de planning s’applique immédiatement au présent et au futur, sans réécrire l’historique.
- Aucune notification système au début d’une plage ; l’état est visible dans dashboard/popup.
- À la fin de la dernière plage du jour, la mascotte peut afficher un message de clôture.
## 6. Sites et quota

- Whitelist prioritaire sur Blacklist.
- Un site possède un nom d’affichage et un domaine/URL technique.
- Le quota est global, quotidien et cumulatif entre tous les sites blacklistés.
- Le quota se remet à zéro le jour suivant.
- Les onglets déjà ouverts sont réévalués immédiatement au début d’une plage ou après un changement de règles.
- À l’approche du quota : warning non bloquant ; à quota zéro : blocage immédiat.
## 7. Dialogue et mascottes

La V1 n’utilise pas d’IA générative. Un moteur de dialogue sélectionne des variantes pré-écrites selon l’univers, le contexte temporel, le type d’événement, la sévérité, l’occurrence et les messages récents. Les variantes sont internationalisées et identifiées par des clés stables pour éviter la redondance.

## 8. Blocage et override

À quota épuisé, le contenu d’un site blacklisté est intercepté immédiatement. S’il existe des tâches assignées via les intégrations, l’écran en présente une au maximum par service, avec compteur et lien « View more ». Sinon, la mascotte affiche uniquement un message contextuel.

1. Demande d’override sur le site bloqué.
2. Première confirmation insistante.
3. Deuxième confirmation plus insistante.
4. Justification obligatoire.
5. Déblocage uniquement dans l’onglet courant.
6. L’override reste valide jusqu’à la fermeture de cet onglet.
7. L’événement et la justification sont journalisés et apparaissent dans le rapport.

Il n’existe pas de limite quotidienne d’overrides en V1.

## 9. Intégrations V1

| Service | Périmètre | Compte | Synchronisation |
| --- | --- | --- | --- |
| GitHub Issues | Lecture seule des issues assignées | 1 | Auto toutes les 5 min + refresh manuel |
| Jira | Lecture seule des tickets assignés | 1 | Auto toutes les 5 min + refresh manuel |
| Linear | Lecture seule des issues assignées | 1 | Auto toutes les 5 min + refresh manuel |

- Plusieurs services différents peuvent être connectés simultanément.
- Le cache local des dernières tâches valides est utilisé si une API est indisponible ou hors ligne, avec indication de dernière synchronisation.
- Une panne d’intégration ne doit jamais empêcher le blocage local de fonctionner.
- Aucune création, édition, fermeture ou synchronisation bidirectionnelle de tâches en V1.
- Productivity Police ne possède pas de task manager interne.
## 10. Dashboard, Activity et popup

Navigation V1 : Dashboard · Activity · Integrations · Settings. Le dashboard couvre le suivi quotidien. Activity conserve les événements détaillés. La popup reste condensée : mascotte, statut ON_DUTY/BREAK/OFF_DUTY, quota consommé/restant, indicateur synthétique et lien vers le dashboard.

## 11. Persistance et confidentialité

- Tout le cœur du produit reste local dans chrome.storage.local.
- Le stockage possède un schemaVersion dès la V1 et les migrations doivent être idempotentes.
- Aucune suppression silencieuse de données lors d’une migration.
- Les snapshots hebdomadaires sont conservés sans limite en V1.
- L’historique Activity détaillé est conservé 90 jours puis purgé.
- Settings propose une suppression de l’historique et une réinitialisation complète distinctes.
## 12. Rapports hebdomadaires

Le rapport se base sur une semaine locale allant du lundi 00:00 inclus au lundi suivant 00:00 exclu et sur les jours de travail configurés. À la clôture, ou au prochain démarrage si Chrome était fermé, un unique snapshot immuable est enregistré localement. Aucun fichier n’est généré automatiquement.

- Student : bulletin / Weekly Report Card.
- Pro : Weekly Performance Review.
- Le rapport suit la DA de l’univers et peut inclure un commentaire textuel de la mascotte, sans illustration.
- Export PDF ou PNG uniquement sur demande, à partir du même template, via Docn UI.
- Le rendu utilise la langue active au moment de l’export tout en conservant les données métier du snapshot.
## 13. Hors périmètre V1

- Task manager interne et tâches locales.
- Écriture dans GitHub/Jira/Linear.
- Plusieurs comptes pour un même service.
- Règles/quota spécifiques par site.
- Exceptions temporaires Whitelist/Blacklist.
- IA générative pour les dialogues.
- Cloud sync obligatoire.
- Rapports quotidiens automatiques.
- Surveillance d’employés ou contrôle parental.
## 14. Décisions normatives V1.2

Les règles ci-dessous lèvent les ambiguïtés de la V1.1 et priment sur toute formulation moins précise dans les autres sections.

### 14.1 Décompte du quota

- Une seconde est consommée uniquement lorsque l’onglet actif d’une fenêtre Chrome au premier plan correspond à un site blacklisté, que l’état est ON_DUTY, qu’aucun override valide n’existe et que l’utilisateur n’est pas idle.
- Un seul compteur peut avancer à un instant donné : plusieurs onglets ou fenêtres ne provoquent jamais de double comptage.
- Le comptage est piloté par les transitions d’état (onglet, fenêtre, URL, planning, idle) et consolidé par un heartbeat ; aucune durée arbitraire n’est reconstruite après une suspension du service worker.
- Le quota est rattaché à la date locale observée au moment du comptage. Un changement de fuseau ne déplace aucune seconde déjà enregistrée.
### 14.2 Planning, domaines et warning

- Les plages sont semi-ouvertes [start, end). Les chevauchements, doublons et plages traversant minuit sont refusés en V1.
- Un domaine est normalisé en minuscules, sans schéma, chemin, port, point final ni préfixe www ; les noms internationalisés sont convertis en ASCII IDNA.
- Une règle pour example.com s’applique à example.com et à ses sous-domaines, mais jamais à notexample.com.
- Le warning est émis une seule fois par date locale lorsque la consommation franchit 80 % du quota. Une modification de quota peut déclencher immédiatement le warning ou le blocage correspondant.
### 14.3 Override et résilience

- Un override est conservé dans chrome.storage.session afin de survivre à la suspension du service worker.
- Il est invalidé à la fermeture de l’onglet, au remplacement de l’onglet ou dès que le domaine normalisé ne correspond plus au site autorisé.
- Si aucun état local valide ne peut être chargé, l’extension autorise temporairement la navigation et affiche une erreur persistante ; elle ne recrée jamais silencieusement un quota ou des réglages par défaut.
### 14.4 Rapports et confidentialité

- Le snapshot contient : secondes de distraction, quota prévu, jours configurés, jours sous quota, warningCount, blockedCount, overrideCount, détail par site et entrées d’override {occurredAt, siteId, justification}.
- La création du snapshot est idempotente par periodStart/periodEnd ; les périodes manquées sont rattrapées au démarrage sans doublon.
- Les justifications restent locales, ne sont jamais envoyées aux intégrations et ne figurent que dans Activity et le snapshot concerné.
### 14.5 Intégrations

- Chaque provider utilise OAuth avec les scopes de lecture minimaux, pagination et gestion explicite de l’expiration ou de la révocation.
- Les secrets ne sont jamais journalisés, inclus dans Activity, les rapports ou les exports. La déconnexion supprime les credentials et le cache du provider.
- Un statut d’authentification expirée est distinct d’une panne réseau et demande une reconnexion explicite.

# Productivity Police

Workflows fonctionnels — MVP consolidé

Productivity Police • V1.2 • 03 septembre 2026

## 1. Onboarding et activation

1. Détecter la langue du navigateur : fr → français ; en → anglais ; autre → anglais.
2. Permettre le changement manuel de langue immédiatement.
3. Choisir Student ou Pro.
4. Configurer jours/plages, quota, Blacklist, Whitelist et intégrations optionnelles.
5. Afficher un récapitulatif + preview du rapport.
6. L’utilisateur clique Activate Productivity Police.
7. Réévaluer immédiatement les onglets ouverts et bloquer ceux qui doivent l’être.
8. Afficher le message final de la mascotte puis le dashboard.
## 2. Début, pause et fin de plage

9. Le temps est évalué selon le fuseau du système.
10. Entrée dans une plage → ON_DUTY, sans notification système.
11. Réévaluer tous les onglets ouverts.
12. Entre deux plages → BREAK et arrêt des contraintes.
13. Nouvelle plage → ON_DUTY et nouvelle réévaluation.
14. Fin de la dernière plage → OFF_DUTY et message de clôture de la mascotte.
## 3. Site blacklisté avec quota disponible

15. Identifier le site par domaine technique et récupérer son nom d’affichage.
16. Si Whitelist → autoriser immédiatement.
17. Si ON_DUTY + Blacklist → commencer/reprendre le comptage.
18. Cumuler le temps dans le quota global.
19. À l’approche du seuil → sélectionner une variante contextuelle dans la langue active et afficher un warning non bloquant.
20. Quitter le site arrête la session courante mais ne réduit pas le cumul.
## 4. Quota épuisé

21. À zéro, bloquer immédiatement l’onglet blacklisté, même déjà ouvert.
22. Rendre l’écran de blocage selon l’univers et la langue active.
23. Lire le cache/tâches des intégrations connectées.
24. Avec tâches : séparer les services, compteur + une tâche max par service.
25. Sans tâche ou erreur API sans cache : afficher seulement le message de mascotte.
26. L’utilisateur retourne travailler ou demande un override.
## 5. Override jusqu’à fermeture de l’onglet

27. Première confirmation.
28. Deuxième confirmation.
29. Justification obligatoire.
30. Associer l’override au tabId courant et au site courant.
31. Autoriser ce site uniquement dans cet onglet.
32. Conserver l’accès tant que l’onglet existe.
33. À fermeture de l’onglet, supprimer l’override.
34. Journaliser événement + justification ; ne pas restaurer le quota.
## 6. Changement d’horaires ou de fuseau

35. À modification des horaires, appliquer immédiatement sans modifier les événements passés.
36. À changement du fuseau système, recalculer l’état courant.
37. Réévaluer les onglets si ON_DUTY/BREAK/OFF_DUTY change.
38. Ne jamais recalculer rétroactivement les métriques déjà enregistrées.
## 7. Changement de langue

39. L’utilisateur choisit français ou anglais dans Settings.
40. Mettre à jour la locale active immédiatement.
41. Re-rendre dashboard, popup, blocker et messages sans recharger l’extension.
42. Ne modifier ni quota, planning, activité, univers, tâches ni snapshots.
43. Les prochains exports de rapports utilisent la langue active au moment de l’export.
## 8. Synchronisation des intégrations

44. Au branchement : première synchronisation.
45. Ensuite : synchronisation automatique toutes les 5 minutes tant que pertinent.
46. L’utilisateur peut déclencher Refresh manuellement.
47. Une réponse valide remplace le cache local et met à jour lastSyncedAt.
48. En cas d’échec/hors ligne : conserver et afficher le dernier cache avec sa date de synchro.
49. Si aucun cache n’existe : considérer qu’aucune tâche n’est disponible sans affecter Enforcement.
## 9. Rapport hebdomadaire

50. À la clôture de la période de travail, calculer les métriques.
51. Créer un snapshot immuable avec période, univers, métriques et informations utiles.
52. Stocker le snapshot localement sans créer de fichier.
53. À consultation : rendre le rapport avec son univers.
54. À export : rendre PDF ou PNG via Docn UI à la demande.
## 10. Rétention et suppression

55. À l’entretien du stockage, supprimer les ActivityEvent détaillés de plus de 90 jours.
56. Ne jamais purger automatiquement les WeeklyReportSnapshot.
57. « Delete activity history » supprime l’historique détaillé sans supprimer configuration/rapports.
58. « Reset all data » exige confirmation puis supprime configuration, historique, caches et rapports locaux.
## 11. Migration de stockage

59. Lire schemaVersion au démarrage.
60. Si ancien : exécuter les migrations séquentielles manquantes.
61. Chaque migration est idempotente.
62. Ne jamais supprimer silencieusement une donnée inconnue ; conserver ou migrer explicitement.
63. Écrire la nouvelle schemaVersion uniquement après succès.
## 12. Cas limites normatifs V1.2

### 12.1 Comptage d’une session

64. Écouter les changements d’onglet actif, de fenêtre au premier plan, d’URL, d’état idle et de planning.
65. Arrêter et consolider la session courante avant chaque transition.
66. Démarrer une session seulement si toutes les conditions de décompte sont réunies ; une seule session globale peut être active.
67. À 80 % du quota, émettre au plus un warning par date locale ; à 100 %, consolider puis réévaluer immédiatement tous les onglets concernés.
68. Après suspension du service worker, repartir du dernier état confirmé sans créditer la durée non observée.
### 12.2 Navigation avec override

69. Persister l’override en stockage de session avec tabId et domaine canonique.
70. À chaque navigation, comparer le domaine courant au site autorisé.
71. Invalider et journaliser OVERRIDE_EXPIRED si le site change, si l’onglet est remplacé ou fermé.
72. Au redémarrage du worker, restaurer uniquement les overrides dont l’onglet existe encore et correspond toujours au site.
### 12.3 Clôture hebdomadaire

73. Déterminer les périodes lundi 00:00 → lundi 00:00 dans le fuseau système courant.
74. À chaque démarrage et alarme, rechercher les périodes closes sans snapshot.
75. Créer au plus un snapshot par période avec les métriques et les justifications d’override nécessaires.
76. Marquer la période comme clôturée seulement après validation et écriture complète du snapshot.
### 12.4 Déconnexion et reset

77. La déconnexion d’un provider révoque si possible son accès puis supprime credentials, configuration et cache locaux.
78. Reset all data efface aussi le stockage de session, arrête tout compteur, réévalue les onglets et ramène l’extension à l’état non configuré.
79. Une erreur de stockage sans dernier état valide suspend Enforcement et affiche une erreur explicite au lieu de recréer des valeurs par défaut.

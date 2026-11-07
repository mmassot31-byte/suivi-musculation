# Classement de saison Élan

Le classement affiche d’abord une saison mensuelle, avec le classement public et un filtre Amis. Les comparaisons existantes restent disponibles dans **Par exercice**, avec leurs références de matériel, leurs conventions et leurs unités inchangées.

## Rangs

| Rang | XP minimum |
| --- | ---: |
| Bronze | 0 |
| Argent | 300 |
| Or | 700 |
| Platine | 1 200 |
| Diamant | 1 800 |
| Élite | 2 400 |

L’écran affiche le rang, la progression vers le suivant, la place, le tonnage mensuel, la collection de badges et les joueurs voisins. Chaque ligne présente ses meilleurs badges réellement obtenus. Les personnes sans XP sont présentes dans leur carte personnelle mais ne reçoivent pas une fausse première place.

## Attribution des XP

| Contribution du mois | Règle | Plafond |
| --- | --- | ---: |
| Présence | 100 XP par jour d’entraînement | 12 jours / 1 200 XP |
| Séries de travail | 2 XP par série | 300 séries / 600 XP |
| Tonnage renseigné | 5 XP par tonne complète cumulée | 100 tonnes / 500 XP |
| Badges gagnés | 10 XP × le meilleur palier atteint du mois par catégorie | 6 catégories / 360 XP |
| Défis | 75 XP par réussite créditée par le moteur existant | 4 crédits / 300 XP |

Les catégories de badges sont Séances, Séries, Tonnage, Régularité, Records et Défis. Les seuils successifs et les répétitions hebdomadaires ne s’additionnent pas dans une catégorie. La collection complète reste acquise au changement de saison ; seuls les badges gagnés dans le mois contribuent aux XP de ce mois. Le calcul utilise leur date d’obtention historique, pas la date d’une ouverture de profil ou d’une resynchronisation.

Une saison suit le mois calendaire courant, avec une borne commune au calendrier Europe/Paris. Les journées d’entraînement réutilisent le calendrier des métriques existantes. Les séances purement chronométrées terminées contribuent aussi à la présence via la projection d’activité existante. Une séance comportant musculation et cardio ne donne pas deux crédits de présence.

Le tonnage réutilise exactement la source `social_metrics` / `social_recorded_tonnage` introduite par la migration 013 : charges renseignées, unités reconnues, sans nouveau multiplicateur par côté ou haltère. Ce rang représente l’activité, pas une comparaison de force absolue entre machines ou personnes. Une très grosse séance reste limitée par chaque plafond.

## Architecture et données

- Migration additive `202611070015_season_ranks.sql` : RPC public `season_rankings`, calcul privé `season_score` et capacité `rankSeasons`.
- Lecture des projections existantes, sans nouvelle table de scores, sans réécriture d’historique ni modification de badge, objectif ou performance.
- Calcul serveur à chaque lecture : une correction, une suppression ou une nouvelle synchronisation se répercute sans cumul artificiel d’XP.
- Amis acceptés uniquement pour le filtre Amis ; blocages respectés dans les deux sens ; égalités au même score avec la même place, ordre stable et pagination distincts.
- Réponses limitées aux données sportives publiques. Aucun e-mail, document privé, note, poids corporel ou mensuration n’est renvoyé. L’aide de calcul interne reste inaccessible aux rôles clients.
- `season-ranks.js` affiche exclusivement les données du serveur. Une panne conserve le dernier score chargé ; si aucun score n’a été chargé, l’écran ne fabrique pas un rang à zéro.
- Les changements rapides de filtre, de vue et de compte invalident les réponses anciennes. Le mode précédent par exercice est conservé pour les services qui n’annoncent pas la capacité.
- Nouveau module inclus dans le déploiement Pages et le cache hors connexion. Aucun nouveau paquet ni modification des pictogrammes existants.

## Vérifications

- `tests/season-ranks-db.cjs` : PostgreSQL jetable et migrations réelles ; données synchronisées, tonnage, attribution des badges, cardio, doublons de jours, égalités, plafonds, mois précédent, corrections/suppressions, collection conservée au changement de mois, amis et blocages, pagination, permissions et documents privés inchangés.
- `tests/season-ranks.cjs` : seuils exacts des six rangs, prochain palier, échappement, badges SVG et réponse retardée d’un autre compte ignorée.
- `tests/season-ranks-ui.cjs` : application et SDK réels avec API simulée ; rang, XP, tonnage, badges, règles repliables, classement public/amis, voisins/pages, anciens exercices, panne/retry, hors connexion et courses entre filtres, compte invité ; largeurs 320, 390 et 430 px.
- Suite de non-régression `npm test` et test PostgreSQL du tonnage enregistré pour vérifier la conservation des calculs précédents.

Les navigateurs automatisés ne remplacent pas une vérification sur iPhone physique ou en mode installé iOS. Aucune invitation ni réaction sociale réelle n’est envoyée par les tests.

## Activation vérifiée

La migration 015 est appliquée au projet indiqué par `cloud-config.js`. Avant son application, les 29 tables publiques applicatives ont été copiées dans le schéma privé `activation_backup_015_20261107`, avec les définitions des fonctions existantes. Les empreintes des sources et des sauvegardes correspondent et les 29 tables sont identiques avant et après la migration. Les rôles clients n’ont pas accès à ce schéma.

L’appel REST anonyme de `season_rankings` a été vérifié sur le projet réel : score égal à la somme des contributions, plafonds et tonnage cohérents, champs publics uniquement. La capacité `rankSeasons` est disponible ; les fonctions de compétition précédentes restent actives. Les tests d’interface authentifiée utilisent des comptes et réponses HTTP simulés ; aucune séance de test n’est écrite dans un compte réel.

Les tests de la nouvelle interface ont été exécutés sous Chromium et WebKit aux trois largeurs mobiles. La suite complète `npm test` est passée, ainsi que le test PostgreSQL de non-régression des trophées de tonnage.

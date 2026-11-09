> Document historique de l’étape 5. Pour la livraison complète et sa politique XP, voir `badges-v2-delivery.md`.

# Fondations du moteur de badges V2

## Contrat et isolation

`badges-v2/index.js` expose le catalogue versionné et `evaluateMuscleVolume(document)`.
Le moteur est une projection pure de l'historique : aucun accès réseau, écriture,
RPC, attribution persistante ou crédit XP. Il n'est branché à aucune interface,
profil, règle V1 ou classement. Aucune migration SQL n'est nécessaire à ce stade.
Les tables de performances V1 ne suffisent pas à distinguer les muscles : le
calcul lit les documents privés complets, sans modifier ces tables.

Les 150 identifiants `v2.*` sont stables. Les 48 badges de volume ont une condition
calculable. Les 102 autres slots restent `reserved`, sans condition, rareté ou
obtention simulée ; leurs identifiants seront conservés lors de leur définition.
Les six raretés du volume suivent l'ordre des six seuils : common, uncommon,
rare, epic, legendary, mythic. Il s'agit de métadonnées propres à V2.
Le champ `reward` réserve la future politique XP : `xp: null`,
`status: pending_policy`, `grantEnabled: false`. Aucun montant n'a été inventé.
`earned` désigne uniquement une éligibilité recalculée, pas une attribution.
Une correction ou suppression historique peut donc retirer une éligibilité.

## Vérification des sources avant implémentation

- `muscles.js` distingue explicitement `primary` et `secondary`.
- `load-conventions.js:exerciseReferenceSnapshot` conserve le profil par série.
- Dans `app.js`, `parseSet` valide charge et répétitions ; l'action de validation
  ajoute la série à `sets` avec le statut `validated`. Les références prévues et
  brouillons restent séparés. Les historiques anciens sans statut sont acceptés
  comme séries enregistrées, conformément au calcul de volume existant.
- Les profils personnels `exerciseMuscles` sont utilisés uniquement si le profil
  enregistré de l'exercice ou de son instantané est absent, comme `classifyExercise`.

Les sources permettent donc de distinguer les séries directes des secondaires.
Cela ne signifie pas que tous les exercices historiques sont classés : profil
inconnu/vide ou invalide = exclusion signalée dans les diagnostics, sans estimation.
Les fixtures V1 `bench` sont précisément non classées ; le moteur ne suppose pas
qu'il s'agit de pectoraux à partir du nom « Synthetic bench ».

## Conventions et progression

Seul `document.sessions` est parcouru, jamais `active`, `importedDrafts`, `refs`,
`plannedSets` ou `activityEntries`. Les séances explicitement abandonnées,
annulées ou brouillons sont ignorées. Deux séances distinctes le même jour
comptent chacune ; les identifiants de séance dupliqués sont refusés.

Les séries de travail enregistrées doivent avoir une charge numérique positive
ou nulle et des répétitions entières positives. Les statuts explicites autres
que `validated`/`completed`, `validated: false`, échauffements et types inconnus
sont exclus. Un type absent représente le format historique `work`. Une série
dégressive compte une fois, sans multiplier selon ses étapes, charge ou côté.

Le profil de `set.exerciseReference` prévaut sur celui de l'exercice. Les
conventions partagées d'Élan (`anatomicalProfile`, `weeklyProfile`) sont réutilisées :
brachial → biceps et abducteurs → fessiers. Les trois faisceaux d'épaule sont
réunis **par série**, sans double/triple comptage. Aucun crédit secondaire,
même fractionnaire, n'est accordé. Les autres groupes musculaires restent hors
des huit groupes demandés. Les profils personnalisés explicites sont prioritaires.

Chaque groupe expose `current`, `nextThreshold`, `nextBadgeId`, `remaining`,
`ratio` (cumul / prochain seuil) et `complete`. Au-delà de 2 500 : prochain seuil
nul, reste zéro, ratio 1. L'absence d'historique n'obtient aucun badge.

## Vérification locale

Depuis `/workspace/suivi-musculation`, sur `chore/isolated-v1-test` :

```sh
npm run test:badges-v2
npm run test:badges-v2:local
```

Les commandes héritent du garde-fou réseau local existant. Le test d'intégration
vérifie d'abord le label du conteneur Docker via le socket local et le port
PostgreSQL `127.0.0.1:55432`. Il utilise uniquement `elan_social`, dans une
transaction `REPEATABLE READ READ ONLY`, puis rollback. Il lit les trois documents
synthétiques existants et leurs six séances, contrôle leur conservation et exerce
une projection JSONB synthétique de 25 séries en deux séances le même jour.
Cette projection SQL ne crée ni table, ni utilisateur, ni badge, ni donnée stockée.
Il faut avoir exécuté les préparatifs V1 locaux `local:start`/`local:seed` ;
ne jamais substituer un service hébergé à un service manquant.

Les tests unitaires couvrent les 48 badges juste avant, au seuil et juste après,
les séries secondaires/échauffements/invalides, instantanés et profils personnels,
les conventions musculaires, corrections, réexécution, progression et immutabilité.
Pas de reset, suppression de ressource, modification V1 ou publication.

# Graphique des séances « Muscles travaillés »

Modification limitée à `radar.js`, `radar-ui.js` et aux styles du composant. `app.js`, les moteurs musculaires/volume/performance, les données d’exercices, les statistiques, les pictogrammes et les autres écrans restent inchangés. Aucune migration ni réécriture des données personnelles n’est nécessaire.

## Calcul dérivé pour l’affichage

Les séries admissibles et le détail anatomique utilisent le parcours existant de `sessionMusclesDetailed` et `anatomicalProfile` : travail validé uniquement, échauffements exclus, dégressive comptée une fois, identifiants de séries et de séances dédoublonnés, aucune multiplication par côté ou haltère.

Le profil est regroupé **avant l’addition**, pour chaque exercice :

- Trapèzes → Haut du dos.
- Faisceaux antérieur, latéral et postérieur de l’épaule → Épaules.
- Biceps et brachial → Fléchisseurs du coude.
- Fessiers et abducteurs → Fessiers, en réutilisant `weeklyProfile`.

Le modèle anatomique existant ne possède pas de muscle brachio-radial séparé. Pour les familles de curls reconnues par `anatomicalProfile`, leur contribution de l’avant-bras à la flexion du coude rejoint les fléchisseurs. Aucune valeur anatomique supplémentaire n’est inventée. Les exercices propres au poignet et les classifications personnalisées d’avant-bras restent séparés. Leurs valeurs d’origine demeurent dans le détail.

Les identifiants regroupés sont uniques ; lorsqu’un groupe est présent en direct et en secondaire sur la même série, le direct prime. Le groupe reçoit `directes + 0,5 × secondaires`. Des séries distinctes d’exercices différents continuent naturellement de s’additionner. Une série polyarticulaire peut contribuer à plusieurs groupes.

## Présentation

Les axes proviennent uniquement des groupes effectivement travaillés dans la séance affichée, indépendamment de son nom/type. Ils ne sont plus limités à huit. Tous partagent une échelle calculée sur la valeur pondérée maximale actuelle, arrondie vers le haut ; ce maximum est indiqué. Une seule surface verte est tracée, avec une valeur par axe. Aucun point secondaire ni contour de comparaison n’est superposé.

Un ou deux groupes utilisent des barres horizontales avec la même échelle commune. Zéro groupe affiche un état vide. Les libellés, valeurs et repères suivent deux colonnes avec hauteur adaptée au nombre de groupes, sans raccourcir les noms ni omettre des axes. Les proportions radiales utilisent toujours la même distance maximale sur tous les axes.

La section repliable conserve les volumes de groupe et les nombres anatomiques directs/secondaires d’origine. En comparaison, les données de l’autre séance restent intégralement consultables dans cette section ; elles ne modifient ni les axes ni l’échelle de la séance courante. Les contrôles de comparaison existants ne sont pas modifiés.

## Validation

- `tests/radar.cjs` : groupes, pondération, priorité du direct, multi-muscles sur une série, curls et poignets, tous les groupes, noms/types indifférents, détails comparés, invalides/échauffements/dégressives/doublons, données et volumes hebdomadaires non modifiés.
- `tests/session-radar-ui.cjs` : vrais écrans de séances enregistrées avec données locales isolées pour Pull, Push, Jambes, Full Body, personnalisée, un/deux groupes et les 14 groupes possibles. Vérifie une seule surface, une valeur par groupe, les limites SVG et les collisions des libellés à 320, 390 et 430 px, le détail anatomique et l’intégrité du document stocké.
- `tests/volume-radar-visual.cjs` : progression hebdomadaire conservée, valeurs D/S et cibles inchangées, graphique actuel et détail comparatif, quatre largeurs mobiles et texte agrandi.
- Tests muscles, volume, performances, bilan/historique, parcours premium, cache hors connexion et suite générale.

Lancer un serveur local avec `npm start`, puis `npm run test:session-radar`. Les contrôles navigateur sont réalisés avec Chromium ; Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles dans cet environnement.

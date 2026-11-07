# Séance en cours : adaptation au visuel fourni

## Interface

- Bandeau de séance avec retour conservant la séance, nom, Terminer, abandon confirmé, exercices, séries prévues, estimation existante et progression réelle. Il reste visible pendant le défilement ; il se compacte à la descente et reprend sa présentation complète à la remontée.
- Le passage entre les deux états conserve la place initiale du bandeau dans le document : les cartes ne sautent pas au changement de hauteur. La partie transparente ne bloque pas les champs situés dessous.
- Carte active vert citron : pictogramme SVG existant, nom, muscles, numéro de série, charge et répétitions directement modifiables avec +/−, durée de repos et validation principale.
- Petits boutons numérotés : une série enregistrée ouvre la correction existante ; la série courante permet de revenir à la saisie ; les séries futures sont des repères désactivés. Les séries supplémentaires restent possibles et sont identifiées « en plus ».
- Dans un groupe en cours, les boutons réutilisent les identifiants et numéros des étapes. Une étape passée ne décale pas la correction des suivantes. Les groupes asymétriques, tri-sets, tours, modes libres, corrections et dissociations conservent leurs actions.
- La dernière performance comparable est discrète et utilise `exerciseSheetData` et les règles d’identité existantes. Pas de comparaison entre matériels/conventions incompatibles, pas de séance future ou abandonnée. Les références initiales non datées restent dans les options, sans être présentées comme une séance réellement réalisée.
- Les anciennes options, séries détaillées, variantes, latéralité, regroupement, correction précédente, action Suivant et objectif de record restent accessibles dans « ··· ». Toucher le nom ouvre toujours la fiche de l’exercice.
- Les autres exercices sont des lignes compactes ouvrables, avec leurs pictogrammes et compteurs réalisés/prévus. Les noms longs sont contenus et restent disponibles dans la fiche.
- Les interfaces cardio et mobilité, les actions de groupe, le bouton de fin de séance en bas et le bilan sont conservés.

## Repos, clavier et données

Le repos conserve son déclenchement automatique après confirmation de l’enregistrement. Aucun bouton de démarrage n’a été ajouté. Le dialogue existant conserve Terminer le repos et Réduire ; la durée reste modifiable. Corriger une série ne redémarre pas le délai.

Le bandeau utilise la zone sûre supérieure et la position du viewport visible. Il se compacte avec le clavier. Les champs restent accessibles et le bouton de validation se place au-dessus du clavier sans recouvrir les commandes +/− ou le choix de repos. La navigation inférieure reprend le comportement existant, masqué pendant la saisie avec clavier.

Aucune calorie estimée, aucun rang « Argent II » fictif et aucun delta « = 0 % » non démontré ne sont ajoutés depuis l’illustration. La durée estimée et les compteurs sont les valeurs existantes de la vraie séance. Le logo, la cloche, l’avatar et les SVG actuels restent utilisés.

Aucun changement de format, aucune migration Supabase et aucune modification des documents utilisateurs par script. Les moteurs `groups.js`, `rest.js`, `performance.js`, `volume.js`, `identity.js`, `achievements.js` et `cardio-timer.js`, ainsi que les données et SVG source, sont inchangés. Les fonctions de validation, correction, lecture des valeurs et gestion du repos dans `app.js` restent identiques ; seuls leur présentation et les nouveaux accès sont adaptés.

## Fichiers

- `live-workout.js` : présentation des compteurs, étapes, dernière performance et contrôleur de l’en-tête ; son état compact reste éphémère.
- `live-workout.css` : styles limités à la séance en cours, adaptations du clavier et des noms longs.
- `app.js` : assemblage de la vue, ouverture des corrections existantes depuis les séries numérotées et raccordement de l’en-tête au viewport.
- `index.html`, `sw.js`, `.github/workflows/pages.yml` : chargement, mise en cache et déploiement des deux nouveaux fichiers.
- `tests/live-workout.cjs`, `tests/live-workout-ui.cjs` : contrôles dédiés ; adaptation des parcours antérieurs aux options repliées et au bandeau.

## Vérifications

`npm test` : **71 scripts terminés avec succès**. Contrôles supplémentaires ciblés sous Chromium et WebKit après ajustement des pictogrammes de groupes.

- Compteurs basés sur les séries de travail valides, distinction prévues/réalisées, échauffements, séries invalides et supplémentaires, progression bornée, cardio non terminé, titres échappés et absence de mutation.
- Étape de groupe passée, numéro original conservé et lien vers la bonne série enregistrée ; contrôle des groupes repliés de trois et huit membres à chaque largeur, tous les SVG à l’intérieur de la ligne sans chevaucher le nom.
- Affichage et interactions à **320, 390 et 430 px**, sous Chromium et WebKit Linux automatisés.
- Défilement vers le bas/haut, position collante et absence de déplacement des cartes lors de la compaction ; Terminer reste visible.
- Ouverture directe des exercices, référence comparable, saisie directe, correction numérotée en préservant le brouillon de la série suivante.
- Repos automatique, réduction, réouverture et arrêt ; délai inchangé après correction.
- Séries supplémentaires, rechargement et reprise, fin de séance confirmée ou annulée et conservation du modèle original.
- Noms de séance et d’exercice longs, débordement horizontal et hauteur limitée de l’en-tête compact.
- Zones sûres simulées : 44 px en haut et 22 px sur les côtés ; le logo et le bandeau restent dégagés.
- Viewport simulant un clavier iOS : hauteur visible 390 px, décalage supérieur 45 px et zones sûres de 44 px en haut / 34 px en bas simultanées, navigation masquée, champ dégagé et validation ne recouvrant ni les +/− ni le repos.
- Non-régression : groupes A-B-A-B-A, tri-sets et modes tournants, corrections, stockage/retry/double validation, import/export, historique, statistiques, communauté et cache hors connexion.

Les [captures de contrôle](verification-seance-en-cours/) utilisent des données de test locales. **Safari sur iPhone physique et le mode installé iOS n’étaient pas disponibles.** WebKit Linux et la simulation du viewport ne permettent pas de déclarer le clavier iOS réel testé.

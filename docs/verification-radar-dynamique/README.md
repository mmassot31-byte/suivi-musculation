# Radar dynamique — vérification

Le modèle `radar.js` et les associations musculaires ne changent pas : muscles présents seulement, 1 série directe + 0,5 série secondaire, même échelle pour le radar et les barres.

Cause : ancien placement dans des couloirs à pas fixe, découpe des noms par nombre de caractères, puis réduction du SVG dans une colonne à côté des valeurs. La hauteur des textes multilignes n'était pas prise en compte par le placement et le cadrage compact.

Correction : calcul des lignes à partir d'une estimation conservatrice de largeur des glyphes, placement ordonné selon l'orientation de l'axe avec réservation de la hauteur de chaque texte, cadrage contenant tous les textes et marges. Les angles restent régulièrement espacés. Les guides discrets relient chaque axe à son étiquette. Aucun chiffre autour du radar ; maximum sous le graphique. Barres existantes sous le radar en deux colonnes ; cas 1–2 conservés en barres simples, cas vide conservé. Aucun nouveau paquet.

Validation :

- `npm run test:session-radar` : modèle, bilan réel, tests dynamiques et présentation du volume.
- `tests/radar-dynamic-ui.cjs` : 0 à 17 groupes × 320/375/390/393/414/430 px, positions contenues sans chevauchement, angles réguliers, points correspondant exactement aux valeurs des barres et à l'échelle, noms longs et sans espaces, zéro dans un modèle de présentation. Les règles métier continuent d'exclure les groupes à zéro.
- Tests migration musculaire, muscles, volume, volume-dashboard, saved-session, muscle-ui, saved-session-ui et shell-update : réussis sous Chromium.
- `npm test` : arrêt dans `tests/smoke.cjs` sur le bouton `performance-detail` absent, avant le parcours séance. Même échec reproduit avec les sources de HEAD avant modification, servies séparément sur le port 4174.
- Fixture `volume-radar-visual` actualisée : `upper_back`/`traps` remplacés par les identifiants actuels de la classification v2 et ordre attendu correspondant. Aucune modification du modèle de volume.
- Budget visuel du bilan mis à jour pour le radar pleine largeur et les barres sous le graphique ; accessibilité des exercices par défilement contrôlée avec marges iPhone simulées.

Les captures utilisent des données locales synthétiques. Les tests de largeurs sont des simulations de navigateur, pas une validation sur un iPhone physique.

WebKit n'a pas pu être exécuté dans cet environnement : le moteur attendu et les bibliothèques Linux nécessaires (GTK 4, Graphene, HarfBuzz ICU, Manette, Hyphen, GLES) ne sont pas disponibles. Le rendu Safari/iOS physique reste à confirmer.

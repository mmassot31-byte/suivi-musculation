# Accueil Entraînement compact

Référence : maquette jointe de l’accueil « Mes séances ». La priorité est la densité réelle et la lisibilité, avec conservation des données et des interactions.

## Changements

- Deux colonnes dès 360 px, notamment à 390 et 430 px ; une colonne sous 360 px pour garder les titres et les chiffres lisibles à 320 px.
- Ancien bloc de styles d’accueil remplacé, y compris ses surcharges mobiles ; suppression du padding vertical de 12 + 12 px hérité des titres de cartes. Les autres écrans ne reçoivent pas ces styles.
- Marges extérieures de 10 px, grille espacée de 6 px, cartes à 7 px de padding, en-tête et sections rapprochés, bandeau statistique abaissé à environ 43 px.
- Titres, pictogrammes, chiffres et boutons ajustés à la largeur disponible. Tous les muscles sollicités restent affichés ; les pictogrammes passent à la ligne. Aucune sélection des seuls muscles principaux, aucune troncature de collection et aucun masquage de valeurs.
- Les séries directes et secondaires restent celles de `plannedMusclePreview` ; chaque cellule conserve son nom accessible et son détail au toucher. Zones de ces cellules d’au moins 44 × 44 px ; boutons Commencer d’au moins 44 px de haut, alignés dans chaque rangée.
- Le titre conserve Modifier / Dupliquer / Supprimer avec confirmation, le bouton Nouvelle séance, les modèles facultatifs, l’avatar, les notifications, la navigation et la reprise de séance restent disponibles.
- Les statistiques conservent les vraies séances des sept derniers jours, hors séances futures et en cours, avec séries de travail et durées connues. Le repère « 7 j » est visible. Les chiffres illustratifs de la maquette ne sont pas copiés.
- Aucune explication superflue ajoutée. L’accueil vierge des nouveaux utilisateurs et la distinction entre modèles et séances personnelles restent inchangés.

## Compacité mesurée

Comparaison des styles avant/après à **390 × 844 px**, avec le même document de référence contenant Jambes, Upper, Pull et Push, mêmes muscles et mêmes calculs :

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Hauteur du bandeau statistique | 74 px | 43 px |
| Début de la grille depuis le haut de la page | 306 px | 203 px |
| Bas du quatrième bouton Commencer | 1 408 px | 688 px |
| Boutons Commencer entièrement au-dessus de la navigation à l’ouverture | 1 | 4 |

Ces mesures concernent ce document et cette hauteur. Une séance personnalisée sollicitant davantage de muscles peut agrandir sa rangée : ses données restent intégralement présentes. À 320 px, la priorité est la lisibilité et l’accès par défilement.

## Vérifications effectuées

- `npm run test:home-compact` : disposition, statistiques calendaires réelles, noms longs, tous les groupes musculaires et leurs SVG, comptes directs/secondaires exacts, modification de type et de séries, lancement et validation réelle d’une série.
- `tests/home-compact-ui.cjs` sous Chromium et WebKit Linux : 320/390/430 px, deux colonnes à 390/430, quatre boutons accessibles à l’ouverture, alignement, absence de débordement, tous les muscles visibles et cibles tactiles, menus, retour Échap, modèles, création et démarrage.
- Cas défavorables : noms très longs ou sans espace, les 18 groupes musculaires fins, grandes valeurs directes + secondaires et plusieurs lignes de pictogrammes ; aucune valeur coupée.
- Simulation de zones sûres à 390 px : 44 px en haut et 34 px supplémentaires réservés à la navigation en bas ; les quatre boutons du document de référence restent dégagés.
- Comparaison complète du document avant/après les simples actions de présentation : aucune mutation des séances, modèles, historiques ou réglages.
- Non-régression complémentaire : `organization-ui`, `editor-onboarding`, `account-isolation-ui`, `editor-offline`, `navigation-scroll-ui` et `rest-home` — menus et suppressions, nouveaux utilisateurs, édition, données par compte/appareil, cache hors connexion, couleurs des onglets au défilement et repos automatique.

Les captures dans [verification-accueil-compact](verification-accueil-compact/) utilisent un document de test local. WebKit automatisé et les zones sûres simulées ne constituent pas un test sur Safari iPhone physique ; cet appareil et le mode installé iOS ne sont pas disponibles ici.

## Fichiers

`design.css` remplace les règles de l’accueil. `app.js` ajoute la classe de portée `home-shell` et le repère de période. `sw.js` renouvelle le cache. Les tests de disposition et de pictogrammes sont adaptés à la nouvelle grille, et le test dédié est ajouté à `package.json`.

Aucun changement des moteurs de calcul, formats de sauvegarde, SVG, catalogue, données source ou fonctions Supabase. Aucune migration et aucune réinitialisation.

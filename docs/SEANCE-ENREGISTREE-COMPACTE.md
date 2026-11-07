# Séance enregistrée — récapitulatif compact

Refonte de la page de consultation d’une séance depuis l’Historique, selon la maquette jointe. Les valeurs illustratives ne sont pas copiées : les données et calculs du document existant restent la source.

## Organisation

- En-tête partagé de 44 px, zones sûres et marges de 10 px des pages modernisées. Retour compact vers l’Historique, ou vers la page d’origine lorsque le bilan est ouvert depuis Progression ou une fiche.
- Statut et date au-dessus du grand titre ; point vert d’Élan et nombre d’exercices réalisés.
- Menu « … » : modifier, préparer la même séance, supprimer avec la confirmation existante. Les trois actions utilisent les moteurs actuels.
- Trois cartes sur une ligne : séries de travail, durée enregistrée et tonnage. Les tonnes affichées sont arrondies pour la lisibilité ; la quantité précise reste dans le titre accessible et le détail.
- Une seule ligne de plan : réalisé/prévu, ajouts et non-réalisés. Elle se déplie pour les objectifs individuels et les groupes/enchaînements conservés.
- Muscles travaillés : radar à gauche, muscle le plus sollicité et total de séries à droite. Détails ouvre l’anatomie complète, les séries directes/secondaires, les données de comparaison et l’aide. Les exercices non classés restent modifiables depuis ce détail.
- Lignes d’exercices compactes et ouvrables : pictogramme, nom, séries et meilleure série. À l’ouverture : toutes les séries, échauffements, dégressives, notes, RIR, convention, comparaisons et lien portant le nom de l’exercice vers sa fiche. Aucun bouton « Fiche exercice ».
- Exercices non réalisés dans un repli séparé. Une activité cardio ou de mobilité garde ses relevés réels et son unité ; aucune charge ou répétition n’est fabriquée.
- Une seule entrée Comparer la séance rassemble les comparaisons disponibles, progrès et records existants, les séries précédentes et l’outil de comparaison de répartition. État simple en absence de série comparable.
- Explications de plan, de tonnage et d’identité dans Comprendre le bilan. L’éditeur existant de date/séries/muscles et les commandes de suppression/duplication restent accessibles.

## Calculs réutilisés

`savedSessionModel` réunit les résultats de `sessionRecap`, `plannedSets`, `activitySummary`, `normalizedTonnage` et `radarModel`. Le résumé musculaire et le graphique reçoivent le même objet `radarModel` ; aucun moteur anatomique parallèle ni somme des axes pour fabriquer un total.

Le muscle le plus sollicité utilise la valeur pondérée existante du radar. Le total de travail reste celui du moteur, sans doublement des séries lors du regroupement. Les axes, noms, fusions musculaires, échelle automatique commune et cas 1/2 groupes en barres sont préservés. Le rendu compact réduit les marges vides du viewBox en tenant compte des libellés ; aucune étiquette ni axe n’est supprimé. Le rendu normal utilisé ailleurs reste inchangé.

Les comparaisons emploient les références compatibles de `sessionRecap` et `setProgression`. Un exercice sans série de travail ne produit pas de baisse fictive. Une absence de référence, une identité ambiguë ou des conventions incompatibles ne deviennent pas une progression. Les données de séries antérieures restent consultables lorsque le moteur les considère comparables.

Le tonnage reprend la règle existante : kg normalisés lorsque les conventions et côtés sont complets, sinon charge renseignée dans son unité. Des unités différentes ne sont jamais additionnées sans conversion explicite ; la partie connue peut être marquée ≥, sinon le total reste inconnu. Les quantités brutes par unité et la couverture sont accessibles dans l’aide. Une durée absente ou invalide reste un tiret.

Aucune modification de `radar.js`, `achievements.js`, `identity.js`, `volume.js`, des formats de sauvegarde ou de la synchronisation.

## Compacité mesurée

Même document de test à **390 × 844 px** : huit exercices, sept réalisés, dix-neuf séries, deux ajouts et deux non-réalisées. Comparaison réelle avec le code publié avant cette mission, puis avec le nouvel affichage :

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Hauteur initiale du récapitulatif, informations repliées | 6 110 px | environ 960 px |
| Bas de la troisième ligne/carte d’exercice depuis le haut de la page | 3 822 px | environ 683 px |
| Statistiques principales | grandes cartes | environ 54 px |
| Carte musculaire | pleine largeur | environ 220 px, radar + résumé côte à côte |

Les chiffres concernent ce document et ces réglages. Toutes les lignes restent dans la page : aucun exercice n’est supprimé ou limité aux trois premiers. Le détail ouvert reprend naturellement davantage de hauteur.

[Captures réelles](verification-seance-enregistree/) : avant, 320/390/430 px, WebKit et simulation de zones sûres. Elles utilisent des données de test locales, pas les données d’un compte de production. La capture à 390 px a été examinée et comparée à la maquette ; padding hérité des statistiques, marges du radar et hauteur des cartes ont été corrigés.

## Vérifications

- Suite générale : **82 scripts réussis**, couvrant entraînement/fin de séance, groupes, édition, historiques, calculs, sauvegardes, hors connexion, comptes et synchronisation simulée.
- Chromium et WebKit mobile tactile à 320/390/430 px : en-tête, statistiques, schéma, lignes compactes, absence de débordement et trois premières lignes avant la navigation. À 390 px, même contrôle avec 44 px en haut et 34 px supplémentaires en bas simulant les zones sûres iPhone.
- Consultation des séries/échauffements/notes, fiche et retour, plan initial, exercices non réalisés, comparaisons, ouverture de l’éditeur, annulation de suppression et comparaison intégrale du document avant/après : aucune mutation de consultation.
- Radar réellement affiché pour Pull, Push, Jambes, Full Body, personnalisé, 1/2 groupes et quatorze axes : une surface, noms conservés, libellés contenus et sans chevauchement aux trois largeurs ; détail anatomique disponible.
- Tests unitaires : séries prévues/réalisées/ajoutées/manquantes, durée connue/invalide/absente, kg/lb et unités mélangées, cardio/mobilité, absence de comparaison fictive, échappement des noms et source intacte.

Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ici. WebKit Linux et les zones sûres simulées ne constituent pas ces tests matériels.

## Fichiers

`saved-session.js` et `saved-session.css` définissent la nouvelle présentation. `app.js` compose cette page et route les actions existantes. `radar-ui.js` partage le modèle et ajoute le cadrage compact. `index.html`, `sw.js` et le workflow Pages incluent les nouveaux fichiers. Tests dédiés : `tests/saved-session.cjs`, `tests/saved-session-ui.cjs` ; parcours de consultation adaptés aux nouveaux accès repliables.

Le bilan immédiat affiché après l’entraînement et l’écran d’entraînement en cours conservent leurs interfaces et leur fonctionnement. Aucune migration, réinitialisation ni modification des données de production n’est effectuée.

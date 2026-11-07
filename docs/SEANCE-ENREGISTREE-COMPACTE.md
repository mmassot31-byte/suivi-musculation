# Récapitulatif de séance enregistrée

Présentation commune du bilan après « Terminer » et de la consultation d’une séance depuis l’Historique, Progression ou une fiche. L’entraînement en cours reste inchangé.

## Présentation

- En-tête partagé, retour vers la page d’origine, nom, date et indication discrète d’enregistrement. Menu existant : modifier, préparer la même séance, supprimer avec confirmation.
- Trois cartes : séries réalisées / prévues, tonnage, durée. Jauge plafonnée au nombre prévu ; les séries ajoutées restent dans le total réel et dans les écarts dépliables. Le tonnage compact conserve sa valeur précise dans le titre accessible et les détails.
- Carte verte « Une étape de plus. » : exercice ouvrable, performance et gain calculé par le moteur existant. Les autres records se déplient depuis leur nombre. Tous les événements sont conservés, même plusieurs records du même type dans un exercice. Une première référence sans historique n’est jamais présentée comme un record.
- Radar et liste des volumes pondérés côte à côte. Les libellés et valeurs sont placés dans cette liste plutôt que superposés au petit graphique. Le détail conserve l’anatomie, les séries directes / secondaires, les comparaisons et l’aide. Un ou deux groupes utilisent des barres en pleine largeur. Aucun axe ni volume n’est retranché ; les muscles non attribués restent signalés dans le détail.
- Exercices réalisés dans leur ordre : pictogramme, nom, séries et meilleure série. Les noms longs peuvent passer sur plusieurs lignes. Les exercices sans attribution disposent d’un pictogramme générique pour conserver l’alignement sans inventer de groupe musculaire.
- Chaque ligne ouvre les séries, échauffements, dégressives, notes, RIR, conventions, écarts, comparaisons fiables et accès à la fiche. Activités cardio / mobilité : relevés et unités réelles. Exercices non réalisés dans un repli séparé.
- Comparaisons et explications complémentaires repliées. Actions explicites en bas : « Modifier ou supprimer » et « Retour à l’accueil », cette dernière en vert. Les retours tiennent compte de la page d’origine ; deux alias d’action locaux réutilisent les parcours existants de l’application.

## Sources des valeurs

`savedSessionModel` réutilise `sessionRecap`, `plannedSets`, `activitySummary`, `normalizedTonnage` et `radarModel`. Le radar et sa liste partagent le même modèle, la même échelle et les mêmes regroupements, sans sommer les axes pour fabriquer le total des séries. La pondération des séries secondaires et la protection contre les doublons restent dans le moteur existant.

Le rendu normal de `radarHtml` reste inchangé. L’option `volumeList` concerne seulement ce récapitulatif compact : mêmes polygones et points, cadrage sans libellés internes, légende externe avec les valeurs du modèle.

Comparaisons : mêmes exercices, matériel et identité de charge admissibles. Les unités ne sont pas additionnées sans conversion explicite ; couverture partielle marquée ≥ et détails par unité conservés. Une durée inconnue reste « — ».

Aucun changement des moteurs `radar.js`, `achievements.js`, `identity.js`, `volume.js`, du format des sauvegardes, de la synchronisation ou de Supabase. Aucune migration ni écriture de données en production.

## Vérifications

- `node tests/saved-session.cjs` : prévu / réalisé / ajouts / manquants, durée absente ou invalide, kg / lb / couverture partielle, cardio / secondes, absence de comparaison et de record inventés, plusieurs records du même type, valeurs du radar identiques au moteur et document immuable.
- `node tests/saved-session-ui.cjs` : application réelle avec document de test local. Vues à 320, 390 et 430 px ; ouverture des 14 records de la fixture, détails des séries, notes, fiche et retour, plan et groupes, non-réalisés, comparaisons, deux accès à l’éditeur, suppression annulée, retour à l’accueil et source inchangée.
- `node tests/finish-action-ui.cjs`, également exécuté sous WebKit : validation finale, nouveau bilan depuis Terminer à 320/390/430 px, ouverture de l’éditeur, retour au bilan puis accueil ; entraînement et sauvegarde conservés.
- Même parcours de consultation sous WebKit : `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 ELAN_BROWSER=webkit node tests/saved-session-ui.cjs`.
- `node tests/session-radar-ui.cjs` : Pull, Push, Jambes, Full Body, personnalisé, 1 / 2 groupes et tous les 14 groupes. Vérification des libellés et valeurs dans la légende externe, sans débordement aux trois largeurs. Séries anatomiques originales accessibles.
- Cas supplémentaires de rendu : un, deux ou tous les groupes, muscles inconnus, séance vide et nom très long, sans mutation du document.
- Bas de page : boutons d’au moins 42 px et accessibles au-dessus de la navigation. Zones sûres simulées à 390 px : deux premières lignes d’exercice visibles avec la carte de records.

À 390 × 844 px, pour la fixture de sept exercices réalisés sur huit : statistiques de 59 px, carte musculaire d’environ 177 px ; trois premières lignes terminées vers 626 / 676 / 726 px, avant la navigation à 768 px. Les sept exercices, l’encart de records et les actions restent dans la page, d’environ 1 041 px une fois les détails repliés.

[Captures réelles de vérification](verification-seance-enregistree/) : données synthétiques locales, aucune performance d’un compte de production. Les captures à 390 px et du bas de page ont été examinées et comparées à la maquette.

Limite : WebKit Linux et simulation de viewport / zones sûres ; Safari iPhone physique et mode installé iOS n’ont pas été testés.

## Fichiers

`saved-session.js`, `saved-session.css`, option de présentation dans `radar-ui.js`, composition commune des deux accès au bilan et deux alias dans `app.js`, cache dans `sw.js`. Tests dédiés et captures mis à jour. Aucun changement des autres pages ni de la navigation globale.

Validation finale : les 83 scripts de la suite générale ont été vérifiés sur cette version, ainsi que les deux parcours du bilan sous WebKit. Configuration publique validée ; aucun secret ajouté aux fichiers servis.

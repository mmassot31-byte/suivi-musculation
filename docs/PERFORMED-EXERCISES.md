# Progression > Exercices — 8 novembre 2026

## Périmètre

Le troisième sous-onglet devient « Exercices » et remplace le catalogue général par le journal personnel des exercices réalisés. Performances conserve son tableau de bord global ; Volume conserve ses analyses. Les fiches existantes, leurs graphiques, leurs réglages et leurs liens vers les séances sont réutilisés.

Les cartes proviennent exclusivement de `state.sessions` : séries de travail validées ou relevés d’activité valides. Un exercice simplement planifié, présent dans un modèle, dans une séance active, annulé ou sans réalisation n’alimente pas le journal. Les anciens historiques sans statut explicite sont acceptés. Les échauffements seuls n’établissent pas une performance de travail.

La vue comprend recherche, filtres musculaires horizontaux, quatre tris, nombre de références réalisées, période et cartes compactes. Les références de matériel/convention incompatibles restent séparées et sont distinguées dans les cartes.

## Données et comparaisons

- Même résolution d’identité et même vérification de compatibilité que le moteur existant (`canonicalExerciseId`, `sameLoadIdentity`). Les instantanés de convention et de référence des séries sont respectés.
- Dernière performance : meilleure série représentative de la dernière séance, selon `exerciseSheetData`. Le record de charge est recherché dans tout l’historique et explicitement nommé. Les répétitions à charge égale restent accessibles dans la fiche existante.
- Évolution récente : comparaison des deux dernières séances de la période. Priorité aux répétitions à charge identique ; à défaut, charge à répétitions identiques. Si les deux indicateurs de la meilleure série évoluent dans le même sens, cette évolution est affichée avec les deux valeurs. Si charge et répétitions évoluent en sens opposés sans référence commune, résultat neutre.
- Assistance : une diminution de l’assistance constitue une amélioration à répétitions égales. Poids du corps : répétitions. Aucun record de 1RM ni estimation de force n’est inventé.
- Mini-graphique : une métrique constante par référence, avec les vrais points datés du moteur existant : charge maximale, assistance minimale ou répétitions au poids du corps. Une courbe peut donc être plate malgré une amélioration des répétitions. Moins de deux dates distinctes : état neutre.
- Cardio/mobilité : relevés réels dans leur unité, avec maximum de durée/distance clairement nommé. Une durée plus longue ne devient pas artificiellement un gain de performance.
- Conventions incertaines : dernière saisie visible, record et graphique comparatif neutres.
- « Plus pratiqués » compte les séances distinctes de la période. « Progression récente » trie les changements comparables normalisés, sans afficher un pourcentage global artificiel. Les records restent sur tout l’historique, tandis que les courbes et évolutions suivent la période.

## Fiabilité

Aucun document historique, record ou programme n’est réécrit. Le journal est un index de lecture en mémoire, invalidé lors de l’enregistrement, de la navigation et du remplacement d’état par la synchronisation existante. Les filtres sont réinitialisés lors d’un changement de compte. Pas de second stockage ni de migration Supabase.

La recherche actualise les résultats sans remonter le champ. L’événement `change` du champ est également traité explicitement pour éviter qu’un clic sur une carte soit perdu lors de la fermeture du clavier ou de la perte de focus.

## Fichiers

- `performed-exercises.js` : index, périodes, filtres, comparaisons et présentation.
- `app.js` : intégration de l’onglet et ouverture des fiches existantes.
- `performance-overview.js` : export du regroupement musculaire déjà utilisé par le tableau de bord, sans changement de son calcul.
- `style.css` : styles limités au journal.
- `sw.js` et `.github/workflows/pages.yml` : cache et diffusion du nouveau module.
- `tests/performed-exercises.cjs`, `tests/performed-exercises-ui.cjs` : nouvelles vérifications ; tests des anciens parcours de bibliothèque adaptés au journal.

## Vérifications exécutées

Les 100 commandes existantes ont été exécutées. Deux anciens parcours attendaient encore la bibliothèque générale : ils ont été adaptés au journal et repassés avec succès. Un test de menu d’exercice a révélé une comparaison de hauteur trop stricte à une fraction de pixel ; la tolérance a été ajustée à 0,5 px et le test repassé. Les deux nouvelles commandes passent également : 102 commandes distinctes réussies après reprises ciblées.

Le parcours complet passe dans Chromium et WebKit : état vide, exclusion des modèles/séances actives, recherche française/anglaise sans remontage, filtres, quatre tris, périodes, vrais records, cas charge/répétitions opposés, graphiques détaillés, répétitions à charge fixe et retour avec filtres conservés. Correction d’une série historique, suppression d’une séance, validation pendant une séance active puis fin de séance, rechargement et persistance ont été réellement exécutés. Captures et contrôles de débordement à 320, 390 et 430 px.

Les tests de modèle vérifient aussi les conventions incompatibles, unités, assistance, poids du corps, durée en secondes, données insuffisantes, dédoublonnage, dates futures et immutabilité des données source.

Ces essais utilisent des documents locaux et une configuration cloud simulée. Pas de modification des données Supabase d’un utilisateur ni de test connecté sur son compte personnel. Safari sur iPhone physique et le mode installé restent à valider sur appareil.

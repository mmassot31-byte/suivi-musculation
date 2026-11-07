# Progression — Performances > Aperçu

Refonte limitée à l’aperçu des performances et à l’harmonisation de l’en-tête de Progression. La disposition reprend la maquette ; les chiffres et courbes sont calculés à partir du document existant.

## Structure

- Une seule barre principale, toujours présente : Performances / Volume / Exercices et muscles. En-tête rapproché du logo ; mêmes dimensions et sélection sur les trois onglets.
- Performances ouvre directement l’aperçu. Suppression de la seconde barre Aperçu / Par exercice / Par muscle. Les listes détaillées restent accessibles par les liens Voir tout, avec Retour à l’aperçu ; les cartes musculaires ouvrent leur groupe.
- Sélection compacte de 7, 30 ou 90 jours ; 30 jours par défaut. Les quatre statistiques, records, courbe et volumes suivent cette période.
- Quatre cartes sur une ligne : performances comparables, séances, séries de travail, temps enregistré. Durée inconnue : tiret ; aucune estimation de calories.
- Bandeau de trois records au maximum, avec les pictogrammes actuels, le nom, la charge et les répétitions, puis le gain réel. Voir tout ouvre la liste des événements de record de la période, y compris plusieurs records d’un même exercice. Le choix Tout l’historique permet également de retrouver les records plus anciens.
- Une carte graphique : exercice ayant au moins deux séances comparables dans la période, de préférence avec une hausse. Courbe placée aux dates réelles ; métrique indiquée, évolution, charge maximale et meilleure série. Toucher le nom ouvre la fiche ; toucher un point ouvre sa séance. Sans historique suffisant, état vide et accès aux exercices.
- Cinq groupes : Pectoraux, Dos, Épaules, Bras et Jambes, avec les SVG existants. Défilement horizontal à petite largeur ; détails par groupe et par muscle accessibles.
- Contenus de Volume et d’Exercices et muscles conservés ; seul leur en-tête commun est harmonisé. Historique du tonnage et filtres avancés de performance toujours disponibles.

## Méthodes des nouveaux indicateurs de présentation

### Performances

Pour chaque exercice, prendre l’identité de charge enregistrée la plus récente. Ne comparer que le même identifiant d’exercice, la même unité, la même convention et le même mode de côtés, selon `sameLoadIdentity`.

Comparer la première et la dernière séance de la période à répétitions identiques, avec une charge strictement positive et sans dégressive. S’il existe plusieurs nombres de répétitions communs, utiliser le plus élevé. Pour cette répétition, retenir la charge maximale de chaque séance. Évolution : `(dernière charge / première charge − 1) × 100`.

La statistique globale est la moyenne arithmétique des évolutions des exercices éligibles, baisses et stagnations incluses ; aucune moyenne des seules hausses. La couverture et la méthode sont accessibles dans l’aide repliée. Première référence, changement de convention, absence de répétitions communes, dates identiques ou base nulle : aucune évolution inventée, affichage d’un tiret.

Le graphique reprend cette métrique fixe lorsqu’elle est disponible (« Charge à 8 rép. (kg) », par exemple). Sinon, il peut montrer la charge maximale réellement enregistrée, sans pourcentage de comparaison. Charge maximale et meilleure série sont des performances brutes de la période avec la même identité. Les graphiques et calculs avancés existants restent inchangés.

### Volume musculaire

Comparer les jours sélectionnés aux jours immédiatement précédents, de durée calendaire identique. Réutiliser `anatomicalProfile`, `weeklyProfile` et la validation des séries du radar. Regrouper les muscles avant d’additionner : une série ne compte qu’une fois par grand groupe ; une contribution directe l’emporte sur une secondaire au sein du groupe.

Volume affiché : séries directes + 0,5 × séries secondaires. Échauffements exclus, dégressive comptée comme une série, doublons de séances/séries ignorés. Une contribution peut naturellement compter dans deux groupes différents.

Pourcentage : comparaison des volumes enregistrés si la base précédente est positive. Base précédente nulle : « Nouv. » si le volume actuel est positif, sinon tiret. Il s’agit d’activité enregistrée, jamais d’un pourcentage de croissance musculaire. La méthode est dans l’aide repliée.

## Vérification visuelle et limites

[Captures réelles](verification-performances-apercu/) avec un document de test local. Capture 390 px examinée et comparée à la maquette, puis hauteur des statistiques, bandeau de records et graphique réduits. Dans ce scénario à 390 × 844 : statistiques de 62 px, cinq cartes musculaires entièrement visibles avant la navigation. Vérifications également à 320 et 430 px.

Zones de sécurité simulées : 44 px en haut et 34 px supplémentaires en bas. Le contenu reste accessible par défilement au-dessus de la navigation. WebKit Linux avec émulation mobile tactile est vérifié ; Safari sur iPhone physique et mode installé iOS ne sont pas disponibles ici.

## Fichiers

`performance-overview.js` contient les nouveaux indicateurs et composants de présentation. `design-ui.js` conserve les listes détaillées et expose les événements de records et périodes. `app.js` compose les vues et actions ; `design.css` définit les proportions, limitées à Progression et à l’aperçu. Le cache `sw.js` et la liste de publication Pages incluent le nouveau module. Tests dédiés : `tests/performance-overview.cjs` et `tests/performance-overview-ui.cjs`.

Aucun changement des données source, des moteurs de calcul existants, des formats de sauvegarde, des fonctions Supabase ou de la logique de synchronisation. Aucune migration de base.

## Tests exécutés

Les 76 scripts de la suite ont été validés : calculs/identités/records/volumes, entraînement et groupes, historiques, écriture locale et sauvegardes, cache hors connexion, isolation des comptes et échanges cloud simulés, éditeur, navigation et vues sociales. L’exécution initiale s’est arrêtée sur une attente de bouton de déconnexion dans le test Notifications ; ce test est passé lors de sa reprise, sans modification de l’application, puis les scripts restants ont tous terminé avec succès.

Tests dédiés supplémentaires sous Chromium et WebKit mobile tactile : captures à 320/390/430 px, quatre statistiques sur une ligne, période variable, records réels et liste complète, courbe et métrique, ouverture d’un point/fiche puis retour, détails par exercice/muscle, cinq groupes, barre principale identique dans les trois pages, absence de débordement et document intégralement inchangé après consultation.

Tests unitaires : hausses et baisses dans la moyenne, répétitions différentes, changement d’unité/convention, première référence, base nulle, dates identiques, période sans données, identité des données source, volume dédoublonné et périodes égales. Une reprise complète hors connexion charge également les nouveaux modules avec le véritable service worker.

Aucune écriture de test sur les données de production. La synchronisation existante est couverte par les tests simulés de compte et d’isolation ; aucune synchronisation manuelle d’un compte réel n’a été provoquée.

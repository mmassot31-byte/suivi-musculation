# Saisie stable pendant une séance — iPhone

Correction ciblée du tremblement pendant la saisie du poids et des répétitions. La recherche précédente de ralentissements réseau a été abandonnée. Au démarrage de cette tâche, `git status --short` était vide : aucune modification partielle de cette recherche n’a été conservée.

## Cause identifiée dans le code

Élan utilise du JavaScript natif. La saisie ne remplace pas les deux champs par des composants React.

Deux mécanismes réagissaient au même clavier :

1. `updateViewport` appelait `scrollIntoView` à chaque événement `visualViewport.scroll` lorsque le clavier était détecté.
2. Le contrôleur de l’en-tête écoutait lui aussi les événements de viewport et de focus. Il réalignait la carte de l’exercice, puis demandait éventuellement un second défilement pour dégager les commandes basses.

Une mise en visibilité du champ peut elle-même provoquer un événement de viewport sur iOS. Le déplacement demandait alors un autre déplacement, parfois dans la direction opposée. Le seuil unique de détection du clavier pouvait également faire alterner les dispositions compacte et normale près de sa limite.

## Correction

- Un seul coordinateur des événements de clavier/viewport ; suppression des écouteurs concurrents de l’en-tête.
- Un événement de défilement du viewport actualise la géométrie, sans redemander un défilement du champ.
- Sur focus ou redimensionnement, regroupement des changements pendant l’animation du clavier, puis au plus un ajustement nécessaire à la visibilité du champ.
- Déplacement borné entre l’en-tête et les commandes : priorité au champ focalisé, sans réaligner le titre de la carte dans la direction opposée.
- Seuils distincts d’ouverture et de fermeture du clavier, pour éviter l’alternance répétée de classes CSS.
- Écritures de géométrie regroupées par animation frame ; hauteur de l’en-tête actualisée seulement si elle change.

Aucune modification de CSS/design, de Supabase, du stockage, de l’enregistrement automatique, des identifiants de séries ou des règles métier. Les ajustements de focus explicitement demandés après une validation restent en place.

Fichiers : `app.js`, `live-workout.js`, version du cache dans `sw.js`. Nouveau test : `tests/input-stability-ui.cjs`, ajouté à la suite générale.

## Vérifications exécutées

Le test de régression utilise le vrai formulaire et IndexedDB, avec une configuration cloud vide. Il simule un viewport réduit/décalé et renvoie un événement de viewport après une demande de défilement, pour vérifier la boucle de rétroaction.

Sur l’ancien code : **54 demandes de repositionnement en 450 ms** dans cette simulation. Après correction : **1 ajustement à l’ouverture**, puis **0 demande de défilement automatique pour les événements de pan**. Ce sont des mesures du scénario simulé, pas une mesure effectuée sur les iPhone des utilisateurs.

Sous Chromium et WebKit :

- saisie caractère par caractère, alternance poids/répétitions, mêmes nœuds DOM, focus et valeurs conservés ;
- position du champ stable à un pixel près pendant une rafale de notifications de pan à géométrie constante ;
- stabilité de l’état du clavier près du seuil ;
- fermeture/réouverture, y compris lorsque le clavier est fermé sans perdre le focus du champ ;
- trois séries consécutives, correction de charge/répétitions dans la fenêtre existante ;
- brouillon réellement sauvegardé et retrouvé après rechargement ;
- répétition de la saisie à 320, 390 et 430 px.

`tests/live-workout-ui.cjs` a également été exécuté dans les deux moteurs : champs dégagés de l’en-tête, du clavier et du bouton Valider, repos automatique, corrections, séries supplémentaires, reprise, groupes et mêmes modèles source. Aucune erreur JavaScript dans ces parcours.

Suite générale : **86 scripts vérifiés**, avec le parcours de Volume rejoué après explicitation du retour à l’en-tête complet avant Abandonner. Aucun contrôle de calcul ou de sauvegarde n’a été supprimé.

## Limite

WebKit Linux avec événements de viewport simulés ne reproduit pas intégralement Safari iOS, l’animation native du clavier, son pavé numérique ou le clavier d’un fournisseur tiers. Une validation sur iPhone physique reste nécessaire, idéalement sur les deux appareils ayant signalé le bug : alterner les deux champs, fermer/réouvrir le clavier, valider plusieurs séries puis corriger une série, sans saut ni perte de valeur.

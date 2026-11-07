# Cardio, gainage et enchaînements — 7 novembre 2026

## Cause et correction

Le minuteur enregistrait sa durée à zéro mais conservait une fenêtre « Objectif terminé » et ne déplaçait ni la sélection ni le curseur du groupe. Les groupes reconnaissaient uniquement `sets[].groupStepId` : un relevé cardio dans `activityEntries` ne pouvait donc pas terminer une étape. Le gainage utilisait encore le formulaire de durée manuelle.

- Une expiration enregistre une seule durée, ferme le chrono et ouvre le passage suivant, le prochain membre du groupe ou le prochain exercice de la séance. Le dernier passage laisse le bouton de fin de séance disponible.
- Le gainage utilise le même compte à rebours, avec pause, reprise, réduction, arrêt anticipé et annulation.
- La durée prévue se saisit directement en secondes, dans l’éditeur et avant de démarrer chaque passage. Le nombre de passages est réglable. Un changement de durée ne modifie pas les passages déjà enregistrés.
- Le prochain chrono attend un appui sur « Démarrer ». Il ne comptabilise donc pas un exercice pendant un déplacement ou une pause. Les repos explicitement configurés dans un groupe restent appliqués.
- Les groupes emploient la même chronologie pour les durées et les séries, y compris les nombres de passages différents, les circuits alternés et les groupes mixtes. Les relevés manuels et corrections restent accessibles.

## Données et compatibilité

`activityRounds` est un champ facultatif (un passage par défaut). Les activités conservent `plannedSets: 0` et des séries de musculation vides : aucun tonnage ni répétition fictive. Les nouvelles durées de programmation sont en secondes ; les relevés historiques restent stockés en minutes, conformément au format existant. Aucun changement de schéma Supabase ni migration des historiques.

Le chrono capture son étape au démarrage. À la fin, la durée, le curseur, le prochain exercice et le repos sont enregistrés ensemble via la sauvegarde existante. L’échec IndexedDB restaure la sélection et le chrono précédents ; une nouvelle tentative utilise le même identifiant de relevé. Un groupe modifié ou dissocié pendant un chrono réduit ne reçoit pas de référence d’étape invalide.

## Vérifications exécutées

- `tests/timed-circuits.cjs` : cardio + gainage, 3/2 passages asymétriques, circuit alterné, idempotence, validation des groupes/imports, dissociation, conservation des étapes déjà réalisées, nouveaux plans/séances, estimation incluant tous les passages et absence de séries de musculation fabriquées.
- `tests/timed-circuits-ui.cjs`, exécuté avec Chromium et WebKit : création avec saisie en secondes ; alternance Rameur/Vélo 3/2 ; gainage sur deux passages ; groupe cardio/musculation avec repos ; fin automatique depuis l’accueil ; pause/reprise ; rechargement pendant le chrono ; panne d’écriture locale et reprise sans doublon ; correction dans l’historique préservant l’étape ; réimport de sauvegarde. Contextes tactiles isolés, largeurs 320, 390 et 430 px et captures réelles à 390 px dans `/tmp/elan-timed-circuit-*-390.png` et `/tmp/elan-plank-seconds-*-390.png`.
- Tests existants de chrono : démarrage volontaire, un seul chrono actif, arrêt anticipé, annulation, blocage de fin de séance tant qu’un chrono tourne, enregistrement unique, correction et suppression des relevés, anciens modèles inchangés.
- Tests de saisie poids/répétitions, repos, groupes de musculation et parcours existants inclus dans la suite générale. Le test de repos avec clavier simulé attend désormais une image de rendu après `visualViewport.resize`, conformément au rendu regroupé par `requestAnimationFrame` de la correction précédente.

Les 88 scripts de la commande `npm test` ont été exécutés avec succès : première séquence jusqu’au test de repos, correction de son attente de rendu puis nouvelle exécution réussie de ce test et de toute la suite restante. Les parcours ciblés sont également passés sur WebKit.

Les tests utilisent IndexedDB de navigateur isolé et des configurations cloud fictives. Aucune donnée réelle de compte n’est modifiée. WebKit sous Linux et une simulation tactile ne remplacent pas Safari sur un iPhone physique : clavier réel, verrouillage prolongé et mode installé restent à vérifier sur appareil. Les échéances absolues récupèrent un chrono terminé à la réouverture ; un navigateur fermé ne peut pas effectuer une transition visible en arrière-plan.

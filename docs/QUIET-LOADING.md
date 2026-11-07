# Actualisation discrète du profil

La ligne « Chargement… » était ajoutée au-dessus de l’identité puis supprimée. Elle déplaçait l’avatar, le nom et les raccourcis. Le profil déjà chargé était également effacé avant chaque nouvelle lecture.

## Correction

- Les annonces temporaires de chargement sont réservées aux lecteurs d’écran, hors du flux visuel. Les erreurs et confirmations utiles restent visibles.
- Le profil personnel déjà chargé reste affiché pendant l’actualisation. Son instantané est conservé uniquement en mémoire, lié à l’identifiant du compte et au pseudo ; il ne crée pas de nouveau stockage persistant.
- À la première ouverture, l’identité et les quatre raccourcis restent immédiatement accessibles. Les options secondaires du bas apparaissent après les statistiques, directement à leur position finale, plutôt que de s’afficher puis d’être poussées vers le bas.
- Les mises à jour du message ne redessinent pas la page en début de requête. Un formulaire de profil en cours d’édition conserve sa saisie lorsque la réponse arrive.
- Les réponses anciennes sont écartées avant de modifier les statistiques communes, y compris après un changement de compte ou de profil.
- La lecture du profil personnel ne charge plus son fil d’activité invisible. La consultation du profil d’un ami conserve ses dernières séances.
- Les messages temporaires équivalents des classements, défis et du fil ne créent plus une ligne visible qui apparaît et disparaît.

Aucune migration Supabase, modification de performance ou de données personnelles n’est nécessaire. Les fonctionnalités et la présentation du profil chargé sont conservées. Le cache du site est mis à jour pour diffuser le correctif hors connexion.

## Tests

- `tests/quiet-loading.cjs` : instantané conservé, séparation entre comptes et réponse d’un ancien compte retardée jusqu’après le chargement du suivant.
- `tests/quiet-loading-ui.cjs` : application et SDK réels, réponses HTTP simulées et ralenties ; positions de l’identité et des raccourcis inchangées avant/après le premier chargement ; profil et options du bas stables lors des actualisations ; erreurs de profil/statistiques visibles sans perte des données précédentes ; saisie préservée ; retour d’un profil public.
- Largeurs 320, 390 et 430 px, sous Chromium et WebKit. Les annonces sont contrôlées par leurs styles et par les coordonnées des éléments, pas seulement par la présence du texte dans le DOM.
- Suite complète `npm test`, incluant comptes, exercices, entraînement, notifications, classements de saison et mise à jour hors connexion.

Aucun compte réel n’est modifié par les tests. Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles dans cet environnement.

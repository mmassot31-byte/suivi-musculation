# Fenêtre « Ajouter des exercices »

Cette évolution concerne le sélecteur uniquement, sans modification du catalogue, de ses identifiants, des pictogrammes, des historiques ni des conventions de charge.

- En-tête et barre de recherche compacts ; trois vues Tous / Récents / Favoris ; filtres muscle et équipement côte à côte.
- La liste seule défile. Les contrôles et le bandeau de confirmation restent visibles dans la hauteur réelle de `visualViewport`, avec les zones de sécurité iOS. Quand le clavier est ouvert, Fermer se place à côté de la recherche pour libérer une ligne ; le titre reste le nom accessible de la fenêtre.
- Les variantes utilisent les familles explicites du catalogue. Les mouvements distincts d’une même famille large sont séparés, notamment pompes/dips, tirages/pull-over et développés/floor press. Les fiches personnelles ou de famille incertaine restent individuelles.
- Une ligne montre le pictogramme existant et le nom court de variante. Le nom complet reste accessible et indexé dans la recherche française/anglaise. Les groupes correspondants s’ouvrent lors d’une recherche ou d’un changement de filtre.
- La sélection utilise les indices des choix d’origine et reste indépendante des filtres, onglets, groupes et favoris. Une validation n’ajoute chaque identifiant qu’une fois ; une nouvelle ouverture permet toujours d’ajouter à nouveau le même exercice dans une séance.
- Une étoile indépendante ajoute ou retire un favori. `exerciseFavorites` est une préférence du document privé existant : persistance locale, synchronisation et isolation par compte réutilisent le stockage actuel. Les sauvegardes et imports conservent cette préférence. Aucune migration Supabase n’est nécessaire.
- Les boutons de sélection et d’étoile sont distincts, avec nom accessible et état `aria-pressed`. Les groupes sont des éléments `details/summary` natifs. Échap/Fermer annulent la sélection et rendent le focus à l’action d’origine ; les favoris sont conservés.
- La validation est protégée contre les doubles appuis. Si la sauvegarde locale échoue, la séance est restaurée et la sélection reste disponible pour réessayer.

Fichiers principaux : `exercise-picker.js` (groupes et préférences), `session-editor.js` (rendu), `app.js` (interactions), `account-store.js` (conservation des favoris), styles limités à `#exercise-picker`, cache et liste des fichiers publiés.

## Vérifications exécutées

- Suite existante de 95 scripts passée.
- `npm run test:exercise-picker` : modèle sans mutation des données, parcours réel de sélection, favoris persistants et isolés entre deux comptes, second appareil simulé et création/modification de séances.
- `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 ELAN_BROWSER=webkit node tests/exercise-picker-ui.cjs` : parcours identique sous WebKit Linux.
- Captures à 320, 390, 393 (iPhone 14 Pro en pixels CSS) et 430 px ; contrôles fixes pendant le défilement ; clavier simulé avec hauteur visible de 380 puis 300 px.
- Recherche complète et alias, plusieurs groupes dépliés, sélection multiple, filtres/onglets, ajout/retrait d’un favori, fermeture/Échap sans ajout, réouverture et historique récent.
- Échec local injecté puis nouvelle tentative, double appui sur Ajouter et conservation des données enregistrées.
- Création/exécution hors connexion avec le véritable service worker, bibliothèque et compteurs cardio existants.

Ces tests n’équivalent pas à une validation de Safari sur un iPhone physique ou de son mode installé. Cette vérification matérielle reste nécessaire.

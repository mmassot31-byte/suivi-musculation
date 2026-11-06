# Tableau de chasse et fin de séance

Le profil présente automatiquement les trois plus hauts **paliers obtenus**, un badge par famille. La sélection compare les niveaux du catalogue, puis les dates d’obtention en cas d’égalité ; elle ne compare pas des kilogrammes à un nombre de séances. Les anciens favoris sont conservés côté serveur mais ne pilotent plus la présentation et aucun appel de sélection de favori n’est effectué.

« Voir mes badges » ouvre le **Tableau de chasse** : seulement les récompenses attribuées, classées sous Séances, Séries, Tonnage, Régularité, Records et Défis. Le filtre de catégorie reste disponible. Les cartes mettent le SVG fourni et le palier en avant. La fiche indique la condition, la date et les occurrences des récompenses répétables, avec Retour aux badges et fermeture claire. Une récompense hebdomadaire reste acquise même quand le compteur courant revient à zéro.

L’espace distinct **En cours** présente le prochain palier non obtenu de chaque famille et sa progression. Les paliers suivants sont accessibles dans une rubrique repliable. Les 68 SVG et seuils sont conservés ; une progression à 100 % ne devient pas une récompense locale sans attribution serveur. Aucune modification Supabase ni migration de données n’est nécessaire.

Pendant l’entraînement, **Terminer la séance** apparaît tout en bas lorsque les exercices prévus sont terminés (ou les étapes de groupe explicitement passées) et qu’au moins une performance a été enregistrée. Une série d’échauffement ou invalide ne suffit pas. Les groupes asymétriques et le cardio sont pris en compte ; un chrono cardio en cours empêche cette proposition. Supprimer une série requise retire le bouton. L’action `finish-bottom` rejoint exactement la confirmation et la sauvegarde du bouton supérieur ; elle ne termine rien automatiquement et ne modifie pas les calculs ni les séries.

## Fichiers

- `trophy-room.js` : sélection automatique, tableau acquis, objectifs et fiches.
- `community-ui.js` : intégration au profil et navigation entre les vues.
- `workout-completion.js`, `app.js` : disponibilité et bouton inférieur de fin de séance.
- `style.css`, `sw.js`, workflow Pages : présentation, cache v46 et livraison des modules.

## Vérifications

- `tests/trophies-completion.cjs` : plus hauts paliers et familles distinctes, anciens favoris ignorés sans mutation, tableau acquis uniquement, séparation des 68 badges, récompenses hebdomadaires permanentes, zéro/tous les badges, séries réelles, correction, groupe asymétrique/étapes passées et garde cardio.
- `tests/trophy-room-ui.cjs` : application/SDK réels avec réponses HTTP simulées, sélection automatique, collection acquise, catégories, progression séparée, date/occurrences, retour/fermeture, aucune écriture de favoris, captures et largeurs 320/390/430 px.
- `tests/finish-action-ui.cjs` : vraies validations de deux exercices, apparition seulement après la dernière série, retrait après suppression, rechargement/reprise et confirmation/enregistrement/bilan par le bouton du bas, accessible au-dessus de la navigation aux trois largeurs.
- `tests/community-ui.cjs`, `tests/social-preview-ui.cjs`, `npm test` : compatibilité des profils, badges, amis, défis, saisie, historique, statistiques et cache hors connexion.

Les captures ont été inspectées dans Chromium. Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles. Les vérifications connectées emploient des réponses de test, sans invitation ni performance de test écrite sur le serveur réel.

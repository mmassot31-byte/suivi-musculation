# Organisation mobile des écrans

Les modifications concernent la présentation et la navigation ; aucune migration SQL ni réécriture de documents existants.

- Accueil : mêmes cartes et même action Commencer. Le titre est le déclencheur natif d’un menu Modifier / Dupliquer / Supprimer, sans rangée de boutons permanente. La suppression utilise le mécanisme existant, avec confirmation, sauvegarde transactionnelle et conservation de l’historique/plannings/séance active. Un seul menu reste ouvert ; clic extérieur et Échap le ferment. Le bouton + porte le nom accessible « Créer une séance ».
- Communauté : lien compact Mon profil et raccourci avatar conservé.
- Profil : identité puis régularité, trois emplacements favoris, statistiques et prochain palier. Les performances publiques complémentaires sont regroupées dans une section repliable.
- Badges : écran dédié immédiatement au premier plan, Retour au profil, Retour à la collection et fermeture explicite d’une fiche. Six catégories : Séances, Séries, Tonnage, Régularité, Records, Défis. Elles regroupent les douze familles et les 68 IDs existants, avec paliers croissants et progression. Les favoris restent vérifiés côté serveur.
- Historique : toutes les dernières séances apparaissent par défaut, triées par instant décroissant. Le calendrier est replié initialement et conserve son état lorsqu’il est utilisé. Les filtres mois/année/jour restent disponibles ; Toutes les séances rétablit la liste générale.
- Progression : résultats et graphiques conservés ; méthodes et explications sont repliables.
- Classements : choix d’exercice, résultats et position d’abord ; recherche, portée et filtre de répétitions exactes sont regroupés dans Filtres et options. La charge exacte reste visible pour la métrique Répétitions, car elle est nécessaire à la comparaison.
- Textes : tutoiement et labels harmonisés. exercise-labels.js fournit des noms français et des alias anglais pour la recherche, sans toucher aux IDs, noms sauvegardés, conventions ou calculs. Les noms personnels non reconnus restent inchangés.

## Validation

Tests dédiés : `npm run test:organization` (recherche/synonymes et parcours application complet), tests Communauté avec les six catégories, paliers triés et retours des écrans, test de recherche d’amis conservé, tests des classements, historique/calendrier, interface premium et fonctionnement hors connexion. La suite npm test contient également les nouveaux parcours.

Largeurs Chromium vérifiées : 320, 375, 390 px et bureau ; texte agrandi et reduced motion. Les captures dans organization-captures viennent des véritables composants avec des données de test isolées. Les tests de suppression utilisent uniquement le stockage de ces contextes navigateur. Aucune suppression ni invitation sur des comptes de production.

Safari/iPhone physique reste une validation manuelle distincte. La publication passe par main et le workflow GitHub Pages ; le cache est incrémenté à elan-shell-v27-organized, sans imposer de rechargement pendant une séance.

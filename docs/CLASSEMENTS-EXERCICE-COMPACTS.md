# Classements par exercice — présentation compacte

Périmètre : Compétition > Classements > Par exercice, et pictogrammes des trois onglets de Compétition. Aucun changement des calculs, du stockage, des migrations ou du sous-menu Saison / Par exercice. Historique et les autres onglets principaux restent inchangés.

- Barre principale : bulle, cible, trophée en SVG `currentColor`, sans changement de hauteur (44 px à 320 px ; environ 44,38 px à 390 et 430 px), marges ni proportions.
- Sélecteur avec pictogramme musculaire/cardio existant, nom tronqué et bouton Filtres sur une ligne. Correspondances préparées au chargement du catalogue, sans recalcul du catalogue à chaque rendu.
- Critères compacts et aide ouvrable par l’icône d’information. Tonnage et compteurs cardio/mobilité conservés lorsqu’ils sont disponibles.
- Liste : rang serveur, avatar, profil ouvrable et performance ; utilisateur connecté mis en évidence. Une référence individuelle ou non comparable affiche « — ». Médailles uniquement pour les rangs numériques 1, 2 et 3 renvoyés dans un groupe comparable.
- L’API actuelle n’inclut pas les avatars dans `public_exercise_rankings`. Une seule lecture groupée de `profiles(id,avatar_path)` complète la page, dans la limite des 25 participants demandés. Un échec conserve les résultats et affiche les initiales. Aucune écriture ni migration.
- Le panneau Exercice, matériel et filtres conserve matériel/convention, charge exacte, répétitions exactes, recherche et périmètre public/amis. Filtres ouvre le panneau et place le focus sur ses réglages.

## Vérifications reproductibles

`node tests/exercise-rankings-ui.cjs` et `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 ELAN_BROWSER=webkit node tests/exercise-rankings-ui.cjs` : application et SDK réels, réponses HTTP synthétiques, aucune écriture en production. Cas visiteur/connecté ; catalogue complet ; machines, cardio et mobilité ; sélection du matériel ; références individuelles sans position ni médaille ; zéro, un et deux participants ; utilisateur connecté ; avatars et secours après erreur ; aide et filtres ; absence de débordement à 320/390/430 px. Captures dans `/tmp/elan-ranking-{chromium,webkit}-{largeur}.png` et `/tmp/elan-ranking-individual-{chromium,webkit}-{largeur}.png`.

Contrôle Supabase réel en lecture seule : capabilities version 1 / completedOnly / challenges ; allExercises actif ; catalogue de 55 exercices ; référence publique d’abducteurs individuelle, un résultat sans rang et avatar accessible. Contrôle du rendu réel à 320/390/430 px, du sous-menu Saison / Par exercice et absence d’erreur JavaScript, sans réaction ni modification de performance.

Les captures à 390 px ont été inspectées : proportions compactes, sélecteur et Filtres alignés, classement immédiatement visible, texte de référence court et détails repliés. Le tonnage disponible reste un troisième critère pour préserver la fonctionnalité existante.

Limites : Chromium et WebKit Linux avec viewport tactile ; pas de test sur Safari iPhone physique ni en mode installé. Les parcours connectés utilisent des comptes synthétiques, jamais les identifiants d’un utilisateur réel.

Validation globale : `npm test` terminé avec succès (83 scripts). Configuration publique vérifiée par `node scripts/check-public-config.cjs` ; aucune clé d’administration publiée.

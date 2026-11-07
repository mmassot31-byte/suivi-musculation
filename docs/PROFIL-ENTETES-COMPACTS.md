# Profil compact et en-têtes communs

La maquette fournie guide la hiérarchie et les proportions. Les chiffres et trophées illustratifs ne sont pas copiés.

## En-têtes des cinq onglets

La classe commune `tab-shell` s’applique aux cinq onglets principaux. `profile-layout.css` définit une seule règle : marge horizontale de 10 px ou zone sûre si supérieure, marge supérieure de 6 px ou zone sûre, ligne logo/cloche/avatar de 44 px et espace de 3 px sous cette ligne. Les commandes de compte et de notification conservent une cible de 44 × 44 px ; leurs centres sont alignés sur celui du logo.

Les anciens réglages d’en-tête propres à Entraînement, Historique et Progression ont été retirés de `design.css`. Les titres principaux partagent leurs dimensions ; les sous-titres existants de ces trois écrans restent présents. Compétition et Profil utilisent désormais les mêmes règles, sans conserver les anciennes marges de 20/18 px.

Pour Compétition, la largeur et les marges du contenu du fil, des défis et des classements sont conservées. Seuls la ligne d’en-tête et le titre sont harmonisés. L’entraînement en cours et les pages secondaires gardent leurs composants existants.

## Profil

- Titre immédiatement sous l’en-tête, puis identité compacte : avatar, pseudonyme, véritable état de synchronisation et menu Modifier / Se déconnecter. Le repère vert de synchronisation n’apparaît que pour l’état Synchronisé.
- Quatre raccourcis conservés, deux colonnes et deux rangées de boutons d’au moins 36 px : amis, poids/mensurations, objectifs et paramètres.
- Mes repères et le sélecteur Total / Cette semaine sur une ligne. Cinq cases séparées avec pictogrammes, sans résumé technique permanent.
- Mes progrès : carte horizontale avec volume cumulé de quatre semaines, valeur, période et graphique chronologique des séances réellement enregistrées. Toucher ouvre Volume avec la période 4 semaines correspondante.
- Trois trophées obtenus au maximum, mêmes SVG et mêmes règles de sélection automatique. Hauteur de référence de 111 px ; premier trophée discrètement souligné. Aucun trophée verrouillé ou fictif pour remplir les places manquantes.
- Performances publiques et Compatibilité de mes exercices : deux lignes compactes, avec leurs fonctions et formulaires existants dans le détail.
- Régularité, défis réussis et précisions sur les données restent dans Autres repères. Choix du pictogramme Homme/Femme, recommandation de l’application, recherche publique, édition du profil, archives et réglages sont conservés.

## Données et limites réelles

Les statistiques reprennent les valeurs du profil serveur. Le nombre de badges correspond aux trophées obtenus du catalogue, comme Tout voir. Tonnage exprimé en tonnes, sans changer son calcul.

**Le serveur actuel ne fournit pas le nombre hebdomadaire de records ni de badges.** Les cinq cases restent présentes avec le sélecteur Cette semaine ; ces deux valeurs affichent un tiret lorsque les champs manquent. Aucun total historique ou zéro n’est substitué à un résultat hebdomadaire inconnu. Le mode Total conserve les cinq chiffres réels. Aucun changement de fonction SQL ou de schéma n’est inclus.

La carte de progrès utilise les séries de travail du document personnel, hors échauffements, séances actives, abandonnées et futures. Les points représentent le cumul enregistré aux dates réelles ; aucun jour vide, aucune référence ou courbe illustrative n’est ajouté. Il faut deux dates distinctes pour tracer la courbe. Sans données suffisantes, la carte affiche une valeur ou une invitation discrète.

Si la période précédente possède une base positive, la valeur peut montrer l’évolution du volume sur deux durées calendaires équivalentes, avec le même nombre de jours écoulés pour la période en cours. Le graphique reste clairement intitulé Volume cumulé ; ce pourcentage n’est pas présenté comme un gain de force ou de masse musculaire. Sans base comparable, la carte affiche le nombre de séries.

## Vérification visuelle

[Captures réelles](verification-profil-compact/) sur document et réponses serveur de test, à 320/390/430 px. Capture de 390 px examinée, puis correction du padding hérité du menu d’identité et réduction des écarts entre sections.

Dans ce scénario à 390 × 844 : identité de 50 px, bandeau de statistiques d’environ 72 px, trophées de 111 px et deux liens complémentaires entièrement visibles avant la navigation. Même vérification avec 44 px réservés en haut et 34 px supplémentaires en bas pour simuler les zones sûres iPhone.

Tests Chromium et WebKit mobile tactile : coordonnées, dimensions et alignement de l’en-tête strictement identiques sur les cinq onglets ; grille des raccourcis, sélecteur et valeurs réelles, courbe et entrée dans Volume, trophées/collection/retour, performances publiques, compatibilité, édition et comparaison intégrale du document avant/après consultation. Aucun changement des données pendant ces actions.

Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ici. Les contrôles WebKit et les zones sûres simulées ne constituent pas ces tests matériels.

## Fichiers

- `profile-layout.css` : règles d’en-tête partagées et proportions du seul profil personnel.
- `profile-presentation.js` : statistiques et graphique dérivés des données existantes, sans écriture.
- `app.js` : portée des cinq onglets et accès à Volume depuis la carte.
- `social-ui.js` et `community-ui.js` : composition du profil et conservation des accès secondaires.
- `design.css` : retrait des règles d’en-tête redondantes.
- `index.html`, `sw.js` et workflow Pages : chargement, cache et publication des deux modules.
- Tests dédiés : `tests/profile-presentation.cjs`, `tests/profile-compact-ui.cjs` et commande `npm run test:profile-compact`.

Aucune modification des comptes, des performances, des historiques, des objectifs, des SVG, des fonctions Supabase ou de la logique de synchronisation. Aucune migration ni réinitialisation de base.

## Résultat des vérifications

- `npm test` : les 80 scripts passent, dont entraînement, historique, volume, performances, comptes/isolement, sauvegardes, cache hors connexion, notifications, trophées et chargement de profil sans déplacement.
- Vérifications supplémentaires des cas sans trophée et avec un seul trophée : aucune carte fictive ; la carte obtenue conserve une largeur lisible.
- Le test unitaire couvre les cinq repères, les valeurs hebdomadaires non fournies, le cumul chronologique, les durées équivalentes, les séances actives, l’état vide, le cas d’une seule séance, l’échappement du texte et l’absence de mutation.
- Les tests de synchronisation et d’isolation utilisent des réponses HTTP simulées. Aucune modification de compte ou de donnée de production n’est effectuée pour les tests.

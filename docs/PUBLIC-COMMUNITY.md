# Fil et classements publics automatiques — migration 011

## Comportement

Toutes les séances **terminées et synchronisées** d’un compte sont publiées automatiquement dans le fil, y compris son historique déjà enregistré. Aucune option de partage ni action manuelle n’est requise. Les séances d’un appareil hors connexion deviennent visibles après sa synchronisation. Une séance en cours et les simples références non réalisées ne sont pas publiées. Les corrections et suppressions sont répercutées à la synchronisation suivante.

Le fil et les résultats se consultent sans connexion. Il faut un compte pour encourager une autre personne ; chaque encouragement est idempotent et annulable. Le blocage masque les interactions et résultats entre les comptes connectés concernés ; il ne rend pas une activité privée, puisqu’une lecture anonyme reste possible.

Une carte correspond à une séance, avec les records personnels mis en avant. Son détail contient les exercices et performances enregistrées : charges, répétitions et compteurs cardio/mobilité. Les notes libres, mensurations, programmes, documents bruts et identifiants d’authentification restent privés. Les noms personnalisés des séances sont remplacés par « Entraînement » ; les noms des exercices réalisés sont publics. Le document privé source n’est pas modifié.

Le sélecteur de classement comprend les **50 exercices de la bibliothèque actuelle**, dont les machines, poulies, exercices au poids du corps, cardio et mobilité. La recherche conserve les synonymes anglais. Les exercices personnalisés locaux peuvent aussi être sélectionnés avant une première performance ; ils rejoignent le catalogue public après une séance terminée valide. Un exercice sans performance reste sélectionnable et propose une action utile, sans inventer de résultat.

Tous les résultats valides sont indexés. Le classement conserve la meilleure performance de chaque personne pour la mesure choisie, avec accès au détail des séries dans le fil. Les comparaisons séparent exercice, équipement, unité, convention de charge, latéralité et modèle de machine confirmé. Une machine ou convention inconnue reste publique dans une **référence individuelle**, sans rang comparatif fabriqué. Les machines identifiées du même modèle sont comparables entre personnes. Aucun modèle n’est déduit d’un nom libre. Les kilogrammes et livres ne sont pas mélangés ; le tonnage, lorsqu’il est entièrement connu, utilise les kilogrammes normalisés existants. Le poids du corps sans lest affiche les répétitions. Cardio et mobilité utilisent leurs compteurs réellement enregistrés ; aucune série musculaire fictive n’est créée.

Le classement public est le périmètre initial. Le filtre Amis reste disponible. L’éditeur de séances, l’entraînement, les calculs de volume/records et les anciennes API de défis ne sont pas refondus.

## Implémentation

- `public-rankings.js` : catalogue complet, références comparables, compteurs et rendu du classement.
- `friend-feed.js`, `community-ui.js`, `social-ui.js`, `cloud-service.js` : lecture publique, fil automatique, détail des séries et intégration compatible avec les versions serveur antérieures.
- `exercise-labels.js`, `scripts/build-public-exercises.cjs`, `supabase/public-exercises.seed.json` : catalogue issu de la bibliothèque réelle ; `npm run build:public-exercises` régénère le fichier de référence. Les évolutions ultérieures du catalogue SQL passent par une nouvelle migration ; ne pas modifier une migration déjà appliquée.
- `202611060011_public_activity_all_exercises.sql` : répertoire, identités de comparaison, résultats, getters publics et remplacement de la projection du fil. Les tables brutes sont protégées par RLS et sans droit de lecture applicatif. Seules les RPC sélectionnées exposent leurs résumés. L’ancienne RPC de partage renvoie `PUBLIC_ACTIVITY_AUTOMATIC`.
- `sw.js`, workflow Pages : cache v42 et inclusion du module public dans les fichiers déployés.

## Activation effectuée le 6 novembre 2026

011 a été appliquée après 001–010 sur le projet configuré dans `cloud-config.js`. Le jeton d’administration de l’environnement a été utilisé sans affichage de sa valeur. INSTALL.sql n’a pas été rejoué ; aucune réinitialisation.

Avant le remplacement, les huit fonctions existantes ont été comparées aux définitions revues de 010. Le schéma privé `activation_backup_011_20261106` conserve leurs définitions et droits, ainsi qu’une copie récupérable des tables `friend_activity`, `friend_activity_cheers` et `friend_feed_settings`. Il est inaccessible aux rôles applicatifs. Dans la même transaction, les empreintes de sept tables sources ont été comparées avant/après : documents privés, profils, amitiés, deux tables de défis, performances de compétition et faits sportifs. Elles sont inchangées.

L’activation a créé 54 entrées de catalogue (50 de bibliothèque et les références personnalisées déjà réalisées), 57 performances actives et trois cartes de séance. Ces nombres sont un constat au moment de l’activation, pas une limite. Les vérifications HTTP réelles utilisent seulement des lectures anonymes et des tentatives refusées, sans publier de séance de test ni envoyer d’encouragement.

Pour un retour arrière, un administrateur peut révoquer les getters publics ajoutés et les nouveaux droits anonymes sur le fil/détail, restaurer les huit définitions et droits conservés, puis restaurer les seules projections du fil depuis leur sauvegarde et les reconstruire avec `friend_feed_project` depuis les documents actuels. Déployer simultanément l’interface précédente. Conserver les nouvelles tables privées pour inspection ; ne jamais restaurer les documents utilisateurs à une version antérieure ni rejouer INSTALL.sql. Les préférences historiques de partage ont été conservées, mais ne sont plus utilisées par 011.

## Vérifications

- `npm test` : suite complète avec `tests/public-community-ui.cjs`, y compris non-régression entraînement, historique, statistiques, défis, notifications, isolation des comptes et fonctionnement hors connexion.
- `node tests/public-activity-db.cjs` : vrai PostgreSQL jetable, rôles anon/authenticated, reprise historique sans inscription au partage, sources privées intactes, détail numérique sans notes, catalogue, machines identifiées/non identifiées, unités séparées, répétitions au poids du corps, référence unilatérale, exercice personnalisé, cardio, corrections/suppressions, exclusion de l’entraînement actif et refus des tables brutes.
- `tests/public-community-ui.cjs` : application et SDK réels avec réponses HTTP simulées, visiteur et compte connecté, aucun appel d’inscription au partage, détail des séries, 50 choix, machines, cardio, mesures et groupes de comparaison, encouragement et largeurs 320/390/430 px. Captures inspectées à 390 px.
- API Supabase réelles : capacités de compétition inchangées, fil public et détails accessibles, chaque exercice du catalogue lisible en classement, tables brutes et documents privés refusés, encouragement anonyme refusé.

Les parcours à deux comptes sont automatisés avec des identités de test et un PostgreSQL isolé. Aucun encouragement, invitation ou défi n’est envoyé à de vrais utilisateurs par les tests. Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ; les contrôles mobiles utilisent Chromium tactile. Le parcours de l’interface locale a aussi été vérifié dans un navigateur avec les vraies API Supabase, sans compte ni écriture : fil public, choix des exercices, sélection d’une machine et absence de débordement aux trois largeurs. La dernière vérification de publication doit confirmer le workflow Pages, les octets servis et le parcours du site publié.

## Publication confirmée

Le déploiement du catalogue complet a finalement réussi avec [le workflow 42287661475](https://github.com/mmassot31-byte/suivi-musculation/actions/runs/42287661475), sur le commit `f628386`. Les huit fichiers publics modifiés correspondaient exactement aux fichiers du dépôt. Le parcours publié a été vérifié avec les vraies API en lecture seule, puis avec les réponses de test pour un compte connecté : fil public, plus de 50 choix, sélection de machine et absence de débordement aux trois largeurs mobiles.

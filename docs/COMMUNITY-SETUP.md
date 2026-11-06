# Communauté : amis, objectifs et badges

Implémentation à partir du kit `elan-amis-defis-badges-codex.zip` et de l’image `elan-iphone-profil.png`. L’archive `elan-apercus-iphone-codex.zip` a ensuite été reçue et comparée : ses vues Amis, Défis et Profil priment pour la composition mobile. La planche du kit n’est pas utilisée comme disposition de téléphone et aucun aperçu statique n’est embarqué dans l’application.

## Organisation

- `community-ui.js` : parcours amis, objectifs avec nom facultatif, collection et favoris ; raccordement minimal dans `social-ui.js`.
- `assets/social/` : 68 badges et 23 pictogrammes fournis, sans remplacement de la bibliothèque musculaire.
- `assets/social/badges.json` : catalogue et seuils d’origine ; `npm run build:social` génère le module navigateur et les définitions SQL.
- `202611050005_community.sql` : relations privées, objectifs séparés des anciens défis, faits sportifs privés, métriques, 68 définitions, occurrences et RPC.
- `202611050006_goal_tonnage_proof.sql` : preuve complète figée du tonnage de référence et exclusion explicite des conventions assistées/poids du corps du tonnage connu.
- `202611050007_personal_record_search.sql` : recherche paginée dans tout l’historique privé, machines comprises.
- `202611060008_goal_titles.sql` : nom facultatif des défis entre amis, compatible avec les anciens clients. Voir [audit, activation et tests](CHALLENGE-CREATION.md).
- `202611060009_social_notifications.sql` : compteurs privés d’invitations et priorité aux invitations reçues dans les listes. Voir [notifications, activation et tests](NOTIFICATIONS.md).
- `202611060010_friends_activity.sql` : fil privé sur partage volontaire, encouragements et classement autour de soi. Voir [parcours, confidentialité et tests](LIVING-COMMUNITY.md).

Les migrations sont transactionnelles. Elles ne rejouent ni INSTALL.sql ni 001–004 et ne réécrivent aucun document privé. La fenêtre des nouveaux objectifs comporte 48 heures de synchronisation ; celle des anciens défis reste inchangée. Les seuils sont évalués avant arrondi. Les scores proviennent des projections serveur, sans écriture directe de score par le navigateur. Les états sociaux ne sont jamais confirmés localement hors connexion.

Les faits dédupliquent les identifiants de séance ; les objectifs/badges créditent un jour d’entraînement par date locale. Les séries principales comptent une fois, les dégressives contribuent seulement au tonnage. Une identité incertaine n’est pas assimilée à une machine ou variante publique. Les records chronologiquement ambigus restent sans crédit PR. Une première observation est une référence. Pour le tonnage d’un exercice, une seule séance doit dépasser la cible et une correction de la preuve de référence invalide son crédit.

Les résultats sont évalués à la consultation et après synchronisation : aucun cron ne modifie les documents d’entraînement. Les badges et favoris sont recalculés après correction ; une semaine passée acquise n’est pas retirée au simple passage à la semaine suivante. Les crédits de défis sont dédupliqués par personne/jour de fin ou paire/jour de fin.

## Activation réelle le 5 novembre 2026

Projet `jiqerlmwsxitdouxpgsg` : migrations 005, 006 et 007 appliquées. Les capacités renvoient `version=1`, `friends=true`, `goalChallenges=true`, `badges=true`. Les capacités de compétition 004 restent actives. Les 68 définitions sont chargées. Les quatre documents privés et quatre comptes sont conservés ; comparaison intégrale des documents avec la sauvegarde avant/après, pas seulement des compteurs. Aucun utilisateur réel n’a reçu de demande ou d’invitation : zéro relation et zéro nouvel objectif lors de la vérification.

Sauvegardes de migration côté serveur : `activation_backup_005_20261105` (copies des dix tables préexistantes et définitions SQL), puis `activation_backup_006_20261105` (fonctions remplacées et documents privés avant contrôle). Schémas privés, accès révoqué aux rôles applicatifs, aucune exportation locale de données privées ou d’authentification. Ces copies sont des protections de migration dans le même projet, pas une sauvegarde externe contre la perte du projet.

Contrôles HTTPS réels : community_capabilities et community_rankings accessibles ; friend_list et goal_list refusés sans authentification (401/42501). Accès brut à social_facts et badge_occurrences refusé aux rôles applicatifs. La preuve complète de tonnage est présente dans la fonction déployée.

Le frontend est modifié dans le checkout et la configuration Pages inclut ses nouveaux modules. La publication de cette intégration utilise le workflow GitHub Pages à chaque push sur main. Le service worker et les assets nécessaires sont préparés pour le prochain déploiement.

## Validation exécutée

- `npm test` : les 30 scripts existants réussissent, y compris entraînement, reprise, export/import, IndexedDB, corrections et hors connexion.
- `node tests/competition-db.cjs` : compétition historique, véritables rôles PostgreSQL anonymes/A/B/C, règles d’accès et anciens défis.
- `npm run test:evolution` : calendrier et parcours de compétition, test adapté à la navigation Communauté et à la section secondaire des anciens défis.
- `npm run test:community` : PostgreSQL 17 jetable et navigateur. Demandes croisées/idempotentes, mauvais destinataire, refus/délai, blocage ; 68 définitions ; jours dédupliqués, échauffements, livres/dégressives, PR machine, premières références, corrections et retrait de favoris ; objectifs personnels et partagés, preuve de tonnage, 700+700 sur deux séances ne valident pas 1000 sur une séance, contributions, réception à +24 h admise/+49 h exclue, abandon, récurrences hebdomadaires, changement d’heure Paris. UI : accepter, défi sans rédaction, recherche Pendulum, cible 60×11, familles, conditions/favoris, 320/375/390 px, bureau, texte agrandi et reduced motion.
- Configuration publique et `git diff --check` : réussis.

Pour reproduire les tests SQL : PostgreSQL 17 local jetable sur 127.0.0.1:55432, utilisateur postgres, mot de passe **de test uniquement** local-test-only, puis `npm run test:community`. Ne jamais adapter les scripts de test vers la production. Lancer `npm start` avant les tests navigateur.

## Captures et contrôles restant à faire

Les captures de `community-captures/` viennent des **modules réellement implémentés**, pilotés par les fixtures de test isolées. Les pseudos/scores sont ceux des tests, pas ceux d’utilisateurs réels. Les règles et autorisations sont testées séparément sur PostgreSQL réel.

Restent non exécutés : parcours de bout en bout par authentification Supabase avec deux vrais comptes de test (session, demande, acceptation, défi, synchronisation d’une séance, consultation depuis l’autre compte), attente réelle d’une échéance et de ses 48 h, Safari/iPhone physique et PWA installée. Les tests SQL de rôles et les fixtures navigateur ne sont pas une validation de ces parcours réseau complets.

Après publication : vérifier la version servie puis les parcours avec deux comptes de test. Vérifier ensuite les parcours ci-dessus avec des comptes de test uniquement. Ne pas réexécuter les migrations déjà appliquées sur ce projet ; pour un autre projet correctement initialisé jusqu’à 004, appliquer 005, puis 006, puis 007, puis 008, 009 et 010.

## Fusion des maquettes iPhone

Les vues reçues ont guidé les segments Amis / Défis / Classements, les cartes de demandes avec actions côte à côte, les jauges/quantités des défis et la hiérarchie favoris → prochain cap → repères. Les améliorations de présentation déjà présentes sur main ont été conservées : identité de profil compacte, options secondaires, pictogrammes SVG, cartes des anciens défis et actualisation du cache HTTP/service worker. Les données et résultats proviennent toujours des RPC, jamais des chiffres des maquettes.

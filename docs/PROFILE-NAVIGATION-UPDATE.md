# Profil, navigation et exercices chronométrés

## Modifications

- Les groupes affichent les pictogrammes musculaires de leurs exercices dans leur en-tête, dans l’éditeur et pendant la séance. Les groupes longs utilisent une mosaïque compacte.
- Le nom personnalisé d’un exercice est enregistré dès la saisie puis à la fermeture de l’éditeur. Il reste distinct de son identifiant, de son matériel et de ses conventions de charge.
- « Recommander Élan à un ami » ouvre le partage du téléphone, avec copie du lien ou sélection manuelle en secours. Le lien partagé ne contient ni pseudo, ni jeton d’invitation.
- PAILs/RAILs et le nouvel exercice Gainage utilisent des secondes : 15, 30, 45, 60, 90, 120, 180 ou 300, avec une durée libre possible.
- Compétition conserve le fil, les défis et les classements. Le profil est accessible par l’avatar et par l’onglet Profil, avec statistiques, objectifs, paramètres et « Poids & mensurations ».
- Les six SVG fournis remplacent uniquement les pictogrammes de navigation. Le choix Homme/Femme détermine le pictogramme Profil et se conserve dans le document privé du compte. Homme est la valeur par défaut.

## Compatibilité et activation

Les durées restent stockées en minutes dans le format existant : 45 secondes correspondent à 0,75 minute. Les conversions ont lieu à la saisie et à l’affichage, y compris dans les bilans, le fil et les classements. Aucun historique n’est réécrit et le cardio conserve son fonctionnement.

Gainage utilise le format existant des exercices chronométrés, sans créer de fausses séries de musculation ni de tonnage. La migration `202611060014_plank_catalogue.sql` ajoute seulement sa référence et ses alias au répertoire public. Elle ne remplace pas les migrations précédentes.

Le choix du pictogramme se synchronise via la sauvegarde privée existante : il ne constitue pas une donnée du profil public. Les préférences des autres comptes et du mode invité restent indépendantes.

## Vérifications

- `tests/navigation-mobility.cjs` : intégrité des six SVG par SHA-256, couleurs héritées, transparence, conversion des durées, nom explicite et icônes de groupe.
- `tests/seven-updates-ui.cjs` : parcours réel de création, groupement, renommage, fermeture et réouverture, exercice chronométré, correction et sauvegarde, bilan, navigation Profil, poids, objectifs, préférence et partage simulé. Largeurs 320, 390 et 430 px, dont un groupe de huit exercices.
- `tests/account-isolation-ui.cjs` : conservation et synchronisation du choix par compte, reconnexion et second appareil simulés ; absence de contamination du compte voisin et du mode invité.
- `tests/public-activity-db.cjs` : migrations dans PostgreSQL de test, catalogue Gainage, durée conservée et absence de fausses performances de force.
- `tests/recorded-tonnage-db.cjs` : conservation du calcul et de l’attribution des trophées de tonnage.
- `npm test` : suite de non-régression, notamment séries, groupes asymétriques, repos, cardio, historiques, statistiques, éditeur, comptes et mode hors connexion.

Les tests de navigateur utilisent Chromium avec des formats mobiles. Safari sur iPhone physique et l’installation sur l’écran d’accueil ne sont pas disponibles dans cet environnement ; ces deux vérifications ne sont pas déclarées réalisées. Le partage natif est simulé pour ne pas envoyer de message réel.

## Activation Supabase réalisée le 6 novembre 2026

La migration 014 a été appliquée au projet configuré. Le catalogue public répond en accès anonyme avec Gainage. Les empreintes des douze tables contrôlées (documents privés, profils, performances, tonnages, activité, amis, défis et badges) sont identiques avant et après. Les anciennes références et leurs alias sont préservés.

Une copie récupérable des tables de catalogue modifiées est conservée dans le schéma privé `activation_backup_014_20261106` (`directory`, `aliases`, `fingerprints`). Aucun accès client n’est accordé à cette sauvegarde. Les précédentes sauvegardes sont conservées.

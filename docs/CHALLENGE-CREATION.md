# Création des défis entre amis — 6 novembre 2026

## Audit et choix retenus

Le parcours existant couvre les séances, séries et tonnes, les modes Chacun / Ensemble et les durées de 7, 14 ou 30 jours. Il manque un nom personnel ; les réglages de quantité sont séparés, les durées peu parlantes et la différence entre les deux modes peu explicite. Enfin, « Refaire » reprend toujours le destinataire d’origine, y compris quand celui-ci est le compte connecté.

La modification reste limitée à la création et à l’affichage des défis :

- Nom **facultatif**, 60 caractères maximum, sans texte imposé. Exemple : « Notre mois en forme 💪 ».
- Aperçu immédiat du nom et de l’objectif, sans perdre le focus ni le clavier pendant la saisie. Les caractères HTML sont affichés comme du texte.
- Quantité prédéfinie et ajustement regroupés ; durées « 1 semaine », « 2 semaines » et « 1 mois · 30 jours ». Le mois reste exactement 30 jours.
- Description courte du mode choisi : chacun son objectif ou un objectif commun auquel chacun contribue.
- Nom visible sur l’invitation et la carte de suivi ; objectif chiffré toujours affiché séparément. Les défis sans nom conservent leur intitulé automatique.
- « Refaire » conserve le nom et sélectionne l’autre participant. Le brouillon est effacé au changement de compte.

Les calculs, les validations de performances, les conditions d’amitié, les délais, les limites d’invitations et la règle d’idempotence restent inchangés. Une invitation encore en attente pour le même ami, objectif, quantité, durée et mode est réutilisée ; son nom d’origine n’est pas remplacé par une nouvelle tentative. Aucun changement de l’entraînement, des pictogrammes ou de la navigation.

## Migration 008

`supabase/migrations/202611060008_goal_titles.sql` ajoute uniquement une colonne `goal_challenges.title` facultative et une contrainte de longueur. Les espaces superflus sont normalisés côté serveur. Aucun défi existant ni document privé n’est réécrit.

La RPC à sept paramètres reçoit `p_title`. L’ancienne signature à six paramètres reste disponible, avec le même paramètre de référence facultatif ; les clients installés envoyant cinq ou six paramètres restent compatibles. `goal_list` renvoie le nom uniquement aux participants, avec les contrôles d’accès habituels. Les défis personnels utilisent toujours l’ancienne signature.

Appliquer **uniquement 008**, après 001–007, dans une transaction, avec une sauvegarde récupérable préalable des défis et définitions des fonctions. Ne pas rejouer les migrations précédentes, INSTALL.sql ou une initialisation. Le frontend est publié après l’activation du backend.

La procédure d’activation de cette livraison conserve, sur Supabase, le schéma privé `activation_backup_008_20261106` : copie des défis, définitions des fonctions remplacées et empreintes des documents/profils. Les droits des rôles applicatifs sont révoqués. La transaction compare les défis avant/après en excluant seulement la nouvelle colonne et vérifie les empreintes des documents et profils ; une différence annule l’opération. Aucune donnée brute n’est téléchargée.

Pour revenir au code serveur précédent, un administrateur peut rétablir les définitions de `goal_create` et `goal_list` conservées dans `function_definitions`, puis révoquer/supprimer la nouvelle surcharge après vérification des dépendances. Conserver la colonne et les noms déjà saisis ; ne pas restaurer une ancienne copie des lignes par-dessus les nouveaux défis. Ce retour n’est pas exécuté automatiquement.

## Activation effectuée

008 a été appliquée le 6 novembre 2026 sur le projet configuré dans `cloud-config.js`, après la sauvegarde et avec les contrôles de conservation dans la même transaction. La colonne et les deux signatures RPC sont présentes ; l’exécution est autorisée au rôle authentifié et refusée au rôle anonyme. Les capacités Communauté/Compétition restent actives. Les appels HTTPS anonymes à `goal_create` avec `p_title` et à `goal_list` retournent bien 401/42501. Aucun défi de test n’a été créé en production.

## Vérifications

- `npm run test:challenges` : PostgreSQL local jetable avec rôles anonymes et trois utilisateurs ; préservation d’une ligne antérieure à 008, clients à cinq/six/sept paramètres, noms accentués/emoji/vides, normalisation et limite, refus des accès tiers, acceptation et réutilisation idempotente. Régression des scores, références, badges et délais existants.
- `tests/challenge-creation.cjs` : application et SDK réels avec deux sessions HTTP **simulées**. Saisie et aperçu, protection HTML, envoi au premier clic depuis le champ actif, quatre séances en trente jours, chacun/ensemble, lecture par l’autre compte, acceptation, rechargement, « Refaire », nom facultatif, erreur/reprise et désactivation hors connexion. Largeurs 320, 390 et 430 px.
- `tests/community-ui.cjs` : parcours personnels, amis et badges conservés.
- Suite générale `npm test`, SQL comptes/compétition, configuration publique et intégrité du diff.

Les tests navigateur utilisent Chromium avec émulation mobile. Safari iPhone physique et le mode installé iOS ne sont pas disponibles. Les deux comptes du test navigateur sont des fixtures : le parcours complet avec deux authentifications Supabase réelles reste un contrôle manuel, sans invitation envoyée à un utilisateur réel par les tests.

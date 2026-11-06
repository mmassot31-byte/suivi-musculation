# Notifications dans Élan — 6 novembre 2026

Une cloche compacte est placée à côté de l’avatar, qui conserve son accès au profil. Le nombre total correspond aux invitations **reçues et encore en attente de réponse**. Ouvrir le panneau ne les efface pas : une acceptation, un refus, une annulation par l’expéditeur, une expiration ou une référence devenue invalide fait disparaître l’élément au prochain contrôle serveur.

Le panneau propose un accès direct aux demandes d’amis, aux défis entre amis et aux défis de records « Bats ma série ». Les onglets Amis et Défis portent aussi leur compteur. Les nombres visuels sont plafonnés à 99+ ; le libellé accessible conserve le total exact. Fermeture par le bouton, Échap ou un clic extérieur. Les invitations utiles passent avant les anciens résultats dans les listes limitées à 100 lignes.

## Actualisation et confidentialité

- Contrôle au chargement, au retour au premier plan, au retour de connexion et toutes les 30 secondes lorsque l’application est visible et connectée.
- Contrôle immédiat après les actions sur les demandes et défis. Si une ancienne lecture est encore en cours, une nouvelle lecture suit son résultat pour ne pas réafficher un compteur antérieur à la réponse. Les compteurs proviennent de Supabase, sans estimation locale.
- Mise à jour ciblée des compteurs et du panneau : aucun rendu complet de la séance, aucun déplacement de contenu, aucun remplacement des champs ni perte de focus.
- Pas de contrôle périodique lorsque le document est masqué ou hors connexion. Le dernier nombre confirmé reste visible durant une erreur ; le panneau signale l’échec et permet de réessayer. « Aucune invitation » apparaît seulement après une réponse valide à zéro.
- Mémoire limitée au compte courant, sans stockage persistant de notifications. Une réponse tardive du compte précédent est ignorée ; la déconnexion efface les compteurs.

Ce sont des **notifications dans l’application**. Elles ne demandent aucune autorisation système et n’envoient ni e-mail ni notification push lorsque l’application est fermée.

## Fichiers et activation

- `notifications.js` : contrôleur, actualisation, panneau et compteurs ; `social-ui.js` : raccordement au profil et à la Communauté ; `icons.js` : cloche dans le vocabulaire graphique existant.
- `style.css` : badge et panneau flottant, sans modification des pictogrammes existants.
- `sw.js` et `.github/workflows/pages.yml` : cache et publication du module.
- `202611060009_social_notifications.sql` : RPC privée `social_notifications()` sans paramètre de compte ; identité obtenue par `auth.uid()`. Exécution réservée au rôle authentifié. Compte tous les éléments valides, indépendamment des limites de pagination ; exclut les demandes sortantes, les demandes d’amis bloquées, les défis entre amis devenus incompatibles avec la relation et les défis expirés/invalides. Les défis de records suivent la validité de référence de leur API existante. Les listes existantes conservent leur format et donnent priorité aux invitations à traiter.

Appliquer uniquement 009 après 001–008. La migration ne contient aucune écriture dans les données utilisateurs. La procédure d’activation vérifie les définitions des fonctions précédentes et conserve les fonctions remplacées dans le schéma privé `activation_backup_009_20261106`. Elle vérifie dans la même transaction que les empreintes des documents privés, profils, relations d’amitié et deux tables de défis sont identiques avant/après. Les sauvegardes ne sont pas accessibles aux rôles applicatifs. Aucun export de données brutes, aucune initialisation et aucun rejeu d’INSTALL.sql.

Un retour éventuel peut rétablir les deux définitions sauvegardées et retirer uniquement la nouvelle RPC, après retour du frontend à sa version précédente. Aucun remplacement de ligne ni suppression de données personnelles n’est nécessaire.

009 a été activée le 6 novembre 2026 sur le projet configuré. Les cinq tables contrôlées sont restées identiques, les deux définitions précédentes sont sauvegardées, les capacités Communauté/Compétition restent actives et l’appel HTTPS anonyme à la nouvelle RPC retourne 401/42501.

## Tests

- `tests/notifications.cjs` : réponse tardive d’un autre compte, déconnexion/reconnexion, erreur/réponse invalide, conservation hors connexion, vrai zéro et 99+.
- `tests/community-db.cjs` : rôles PostgreSQL réels ; compte par destinataire, acceptation/refus, anonymes refusés, 27 demandes malgré la page limitée à 25, blocages/expiration et invitation conservée devant 110 défis annulés.
- `tests/competition-db.cjs` : défis de records entrants uniquement, acceptation, expiration et invalidation de référence ; règles sportives existantes préservées.
- `tests/notifications-ui.cjs` : application et SDK réels, deux comptes HTTP simulés. Compteurs, liens directs, réponses aux trois catégories, actualisation, visibilité/reconnexion/erreur/retry, état vide et déconnexion. Contrôle des mêmes nœuds, valeurs, focus et positions pendant une séance. Largeurs 320, 390 et 430 px.
- Suite générale, parcours Communauté existants, SQL comptes et vérification de la configuration publique.

Les tests n’envoient aucune invitation à de vrais utilisateurs. Safari sur iPhone physique, PWA iOS installée et parcours avec deux authentifications Supabase réelles restent à vérifier manuellement ; l’émulation Chromium ne les remplace pas.

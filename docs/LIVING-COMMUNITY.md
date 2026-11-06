# Communauté : fil Amis, défis et classement personnel

> Document historique de la migration 010. Le partage facultatif et la visibilité limitée aux amis décrits ici sont remplacés par la migration 011 activée. Voir [le fonctionnement public actuel](PUBLIC-COMMUNITY.md).

## Parcours

Amis affiche d’abord le défi actif le plus proche de son échéance, en privilégiant les défis partagés, puis les séances récentes des amis. Le bouton « + » ouvre la recherche, les demandes et la gestion des amis ; Retour au fil revient aux cartes. Les notifications de demandes ouvrent directement ce gestionnaire.

Une carte permet d’encourager d’un geste, d’annuler son encouragement et d’ouvrir le **résumé partagé** : durée connue, séries de travail et exercices. Une séance produit une seule carte, même après plusieurs synchronisations. Un record personnel la met en avant sans créer plusieurs publications pour la même séance ; une correction rétablit la carte de séance normale si le record n’est plus valide. Les encouragements restent attachés à la même séance. Les séances cardio terminées sont représentées sans créer de séries musculaires ni de record artificiel.

Le partage est **désactivé par défaut**, y compris pour les comptes existants. Chacun peut activer « Mon partage » pour ses prochaines séances. L’activation ne publie pas l’ancien historique ; la désactivation retire immédiatement l’accès côté serveur et une réactivation repart de sa nouvelle date. Le fil est limité aux amis acceptés non bloqués, sans publication publique. Les notes, mensurations, programmes et documents bruts ne sont jamais renvoyés. Les noms de séances personnalisés sont remplacés par « Entraînement » ; seules les catégories standard sont affichées. Le résumé partagé n’est pas une copie complète de la séance privée.

Le fil se recharge à l’ouverture, au retour au premier plan et périodiquement lorsqu’il est visible en haut de l’écran et sans interaction en cours. Il ne rafraîchit pas l’écran d’entraînement. Un échec reste distinct d’un fil vide et propose Réessayer. Aucun message, invitation, partage ou encouragement réel n’est envoyé par les tests.

Les défis actifs précèdent les invitations ; leur objectif, les participants, la progression et le temps restant sont visibles. Les options « Chacun son objectif » et « Objectif commun » reprennent les modes existants `each` et `together` : **défis à deux**, sans création de groupe à plusieurs. Les durées restent 7, 14 ou 30 jours à partir de l’acceptation, sans les présenter comme une semaine civile. La confirmation après 48 h demeure dans les détails. Aucun score ni règle de contribution ne change.

Le classement commence par un exercice récemment pratiqué, confirmé par les candidats serveur, puis la place parmi les amis et jusqu’à trois personnes voisines. Matériel, convention, unité et mesure restent visibles. Les filtres, métriques alternatives et records absolus sont regroupés. Les actions contextuelles permettent de changer d’exercice, choisir une charge exacte, inviter un ami ou revenir à l’entraînement pour enregistrer une performance. Un visiteur voit d’abord l’intérêt du parcours avant la connexion.

## Données et migration 010

`202611060010_friends_activity.sql` ajoute trois tables privées et des RPC authentifiées. Aucun document privé, historique ou réglage existant n’est réécrit. Les anciennes API restent disponibles ; les nouvelles capacités `friendFeed` et `personalRankings` activent le parcours moderne, avec repli compatible avant migration.

La projection s’exécute **après** les projections sportives existantes grâce à l’ordre explicite du nouveau trigger `zz_friend_feed_updated`. Elle reprend les critères de records de `social_metrics`, utilise les faits valides et dédupliqués et stocke uniquement un résumé sélectionné. Le getter et chaque lecture/réaction revérifient l’amitié, les blocages et le partage. Tables et fonctions internes sont refusées aux rôles applicatifs ; la clé publique seule ne permet pas de lire le fil. Les réactions sont idempotentes.

Pour les classements, `community_rankings` conserve les calculs et filtres existants et ajoute seulement `myOffset`. `community_rank_nearby` l’utilise pour demander la bonne page : un ex æquo garde son vrai rang, même si sa position alphabétique dans la liste est éloignée du début. Les variantes canoniques, conventions, unités et règles de latéralité restent inchangées. Aucune conversion entre matériels ni admission automatique d’une référence incertaine.

Appliquer uniquement 010 après 001–009. La procédure d’activation vérifie les fonctions précédentes, en conserve les définitions et droits dans `activation_backup_010_20261106`, et compare dans la même transaction les empreintes des documents privés, profils, amitiés et deux tables de défis. Elle vérifie aussi qu’aucun compte n’a été inscrit au partage ni aucune activité publiée par l’activation. Aucune donnée brute n’est téléchargée et INSTALL.sql n’est pas rejoué.

Un retour éventuel consiste à revenir au frontend précédent, retirer le nouveau trigger et restaurer les deux fonctions sauvegardées. Conserver les nouvelles tables tant qu’elles contiennent des choix de partage ou encouragements ; ne pas écraser les données personnelles avec une ancienne copie.

010 a été activée le 6 novembre 2026 sur le projet configuré. Les cinq tables contrôlées sont restées identiques ; les deux définitions précédentes sont sauvegardées et protégées. Les nouvelles capacités sont actives. Les cinq nouvelles RPC applicatives résolvent correctement sur HTTPS et refusent l’accès anonyme (401/42501). À l’activation : **zéro compte inscrit au partage et zéro activité publiée**.

## Fichiers et validation

- `friend-feed.js` : fil, détail, encouragements et partage volontaire.
- `community-ui.js` : gestion compacte des amis, défi mis en avant, modes coopératifs et états vides.
- `social-ui.js` : classement personnel, choix initial, filtres et navigation des notifications.
- `style.css`, `sw.js`, workflow Pages : présentation et publication du module.
- `tests/friends-feed-db.cjs` : vrais rôles PostgreSQL, trois niveaux d’accès, activation sans historique, données autorisées seulement, corrections/suppression/blocage/arrêt, cardio valide/invalide, réactions idempotentes, voisins du classement et ex æquo.
- `tests/friends-community-ui.cjs` : vraie application/SDK avec HTTP simulé ; fil, détail, réaction, gestion d’amis, défi en avant, coopération, exercice pratiqué, place et voisins, filtres, actions vides, partage, erreurs et aperçu visiteur à 320/390/430 px.
- Suite générale `npm test`, SQL compétition avec 010, SQL Communauté existante et configuration publique.

Les tests utilisent des données isolées ; ils ne font pas partager les vrais utilisateurs. Le parcours avec deux authentifications Supabase réelles, Safari sur iPhone physique et le mode installé iOS restent des vérifications manuelles. Les captures sont des fixtures et ne représentent pas les données de vrais amis.

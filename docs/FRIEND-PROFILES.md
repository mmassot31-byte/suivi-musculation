# Accès aux amis et activité sur les profils

Dans Communauté → Fil, le bouton **Mes amis · N** ouvre directement les amis acceptés, sans formulaire de recherche à traverser. La liste récupère toutes les pages du service existant, y compris au-delà des 25 premières relations. Le « + » conserve l’ajout d’amis ; les notifications ouvrent toujours les demandes. Les avatars et pseudos ouvrent le profil. L’écran conserve les trois onglets principaux.

Le profil public affiche immédiatement les dernières séances, avec un aperçu des dernières séries et compteurs (machines, cardio et mobilité compris). Toucher une carte ouvre son détail complet avec les conventions de charge. Les encouragements utilisent la fonction existante. « Voir plus » charge cinq séances supplémentaires ; Retour ramène à la liste d’amis. Le fil public et l’activité du profil ont des états et rafraîchissements séparés. Une réponse tardive d’un autre profil est ignorée. Une erreur technique propose Réessayer et reste distincte d’une absence de séance.

Les badges, repères et anciens records restent accessibles sous les séances. Les règles de publication automatique de 011 restent identiques : séances terminées et synchronisées, notes et mensurations privées, blocages appliqués aux lectures connectées. Une lecture anonyme reste publique. Le profil peut être ouvert par son lien public, y compris avec une casse différente.

## Données et activation

`202611060012_friend_profile_activity.sql` ajoute uniquement la RPC publique `profile_activity(p_username,p_offset)` et la capacité `profileActivity`. Elle réutilise `friend_activity_data` et `friend_activity_visible`, avec filtrage du propriétaire **avant** pagination. Aucun nouveau résumé calculé depuis le document privé, aucune table ajoutée, aucune modification des données, scores ou règles d’entraînement.

La procédure d’activation vérifie la définition de capacité de 011, conserve sa définition et ses droits dans le schéma privé `activation_backup_012_20261106`, et compare les empreintes de neuf tables sources dans la même transaction. Le schéma de sauvegarde reste inaccessible aux clients. Le retour arrière consiste à révoquer/supprimer la nouvelle RPC et à restaurer la définition de capacité conservée ; les données utilisateurs n’ont pas à être restaurées. Ne pas rejouer INSTALL.sql.

## Vérifications

- `node tests/public-activity-db.cjs` : vrai PostgreSQL jetable, rôle anonyme et authentifié, filtrage du bon profil, casse, tri, pagination 5 + 1, absence de doublons, blocage, profil inconnu, exclusion des notes, documents privés inchangés et accès brut refusé.
- `tests/friend-profiles-ui.cjs` : application et SDK réels, réponses HTTP simulées, deux amis puis 26 amis paginés, liste/avatar/profil/retour, retour au profil personnel sans mélanger les données, aperçu machine et cardio, détail des séries, encouragement conservant l’aperçu, pagination, rafraîchissements isolés, vide/erreur/retry, changement rapide de profil, lien public anonyme et largeurs 320/390/430 px. Captures inspectées à 390 px. Aucune invitation ou réaction réelle.
- `npm test` : suite complète, dont les demandes d’amis, notifications, entraînements, historiques, statistiques, isolation des comptes et cache hors connexion.

Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ; les contrôles mobiles sont simulés dans Chromium tactile. Les API réellement activées et le site publié sont vérifiés séparément en lecture seule et avec les réponses de test pour les parcours connectés.

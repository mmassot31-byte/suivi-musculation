# Fil, encouragements et cohérence des repères — 7 novembre 2026

## Corrections

- Toucher une activité contenant un record ouvre sa fiche. Chaque record comparable affiche l’exercice, la performance exacte, la référence précédente et le gain (charge, répétitions à charge identique ou tonnage). Plusieurs records restent consultables. Les séries complètes restent en dessous. Encourager depuis cette fiche conserve le détail chargé.
- La cloche additionne les invitations et les nouveaux encouragements non lus. Le panneau nomme la personne et la séance/le record concerné. Toucher l’encouragement ouvre l’activité et le marque comme lu ; « Tout marquer comme lu » et la pagination restent disponibles. L’actualisation existante (30 s, retour dans l’application, reconnexion, ouverture de la cloche) ne reconstruit pas l’entraînement en cours.
- Un encouragement répété ne crée pas de doublon ; le retrait masque l’alerte, son réajout ne relance pas une alerte déjà lue. Les activités retirées et les personnes bloquées restent filtrées. Aucun ancien encouragement n’est transformé rétroactivement en notification.

## Diagnostic de @Max

La vérification du document réellement synchronisé a retrouvé cinq séances et 89 séries de travail, pour 42 083 kg saisis. L’ancien profil comptait quatre séances : une séance importée sans date de fin contribuait déjà au tonnage, mais pas au compteur social. Les compteurs compétitifs sont aussi plafonnés par jour et peuvent exclure les séances purement cardio. Ils ne doivent pas être utilisés comme un compteur personnel d’historique.

Le profil personnel compte désormais les séances sauvegardées, y compris l’historique importé et le cardio. Les preuves et compteurs des compétitions, les badges et leurs règles ne changent pas. Pour son propre profil, l’application réutilise immédiatement `savedActivity`, `activitySummary` et le tonnage de l’historique, à partir des données locales du compte : les valeurs restent cohérentes avant et après synchronisation et en cas d’ancienne réponse serveur. Les statistiques publiques du profil utilisent la nouvelle source personnelle côté serveur. Les périodes restent explicites : « Cette semaine », « Total » et les sept derniers jours de l’accueil ne représentent pas toujours le même intervalle.

## Activation Supabase

Migration additive : `202611070016_activity_notifications_profile.sql`. Aucune réinitialisation, modification de document privé ou réexécution d’INSTALL.sql.

Avant activation : accès administratif vérifié sans afficher le jeton, prérequis et définitions existantes comparés aux migrations relues. Une copie récupérable des 29 tables publiques et des définitions/permissions de fonctions a été conservée dans le schéma privé `activation_backup_016_20261107`. Les empreintes de toutes les tables sources ont été comparées dans la même transaction : aucune ligne existante modifiée par la migration. Le schéma de sauvegarde et les tables internes de notifications restent inaccessibles aux clients.

La nouvelle projection personnelle et la table/les RPC de notifications ont été réellement activées. L’API HTTP publique de `social_profile('Max')` renvoie désormais **5 séances, 89 séries, 42 083 kg** ; le document privé et sa version sont inchangés à la vérification.

## Tests

- `tests/activity-social-db.cjs` : PostgreSQL jetable local, migrations et vrais rôles/RPC/déclencheurs. Records charge/répétitions/tonnage avec référence/gain, corrections, séances anciennes/cardio/multiples par jour, compteurs compétitifs préservés, notifications destinataire uniquement, doublons, lecture, retrait/réajout, blocages, pagination, permissions et documents privés inchangés.
- `tests/activity-social-ui.cjs` : application et SDK réels avec deux comptes HTTP fictifs. Encouragement de Marion, cloche de Max, lien vers le record exact, état lu conservé après rechargement, détail préservé après réaction, repères locaux face à une réponse serveur périmée et comparaison avec l’historique. Chromium et WebKit, 320/390/430 px, captures réelles à 390 px.
- Tests existants de notifications et leur stabilité pendant une séance, cache et isolation des profils, profil compact, tonnage/badges SQL et classements de saison SQL. Les anciennes valeurs illustratives de certains tests de profil ont été remplacées par les valeurs de leur véritable document de test.

Les 89 scripts de la suite de l’application ont été exécutés avec succès, par groupes après mise en cohérence des données fictives des tests de profil. Les tests PostgreSQL des nouvelles fonctionnalités, du tonnage/badges et des saisons passent également. L’API HTTP réelle du fil de @Max fournit deux records comparables avec ancienne référence et gain.

Aucun encouragement, demande d’ami ou défi de test n’a été envoyé à un compte réel. Les parcours à deux comptes sont exécutés avec des comptes fictifs ; le serveur réel est contrôlé par ses définitions/permissions, ses empreintes et la lecture HTTP du profil. Safari sur iPhone physique et le mode installé restent à vérifier sur appareil. Les notifications sont internes à l’application ; elles ne sont pas des notifications push quand l’application est fermée.

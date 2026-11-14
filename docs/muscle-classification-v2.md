# Classification musculaire v2

Audit : `muscles.js` centralise profils et volumes, `volume.js` applique 1/0,5 ; `radar.js` dérive la répartition. Les instantanés de séances, séries et références par série sont les sources. IndexedDB et Supabase synchronisent ces sources, sans table de statistiques musculaires à recalculer. Les badges utilisent les séances/séries/tonnages et ne sont pas modifiés.

Migration v2 pure à la lecture, reproductible et idempotente : aucune réécriture de séance, modèle, référence, performance ou définition personnelle. Les anciens identifiants restent valides pour import/synchronisation. Shrugs et tirages menton → supérieurs ; rowings identifiables et face pulls → moyens/inférieurs. Les références ambiguës sont conservées dans le JSON source, hors compteurs actifs, accessibles via `unresolvedMuscleReferences`. Aucune duplication entre rôles. Aucun transfert systématique depuis « haut du dos ».

Les objectifs historiques restent intacts et valides. `pendingMuscleTargets` les expose et le panneau d’objectifs indique de définir les objectifs individuels, sans recopier les valeurs. Les objectifs actuels et leurs dates restent inchangés.

Bibliothèque active : shrugs, rack pull, farmer walk, high pull → supérieurs ; rowings → dorsaux avec moyens/inférieurs secondaires, sauf rowings deltoïdes postérieurs ; face pulls → rétraction scapulaire. Tirages verticaux et oiseau sans rétraction explicite : pas d’attribution inventée de trapèzes. Les deux régions utilisent `trapezes` existant. Aucun rhomboïde séparé.

Supabase : appliquer `202611140001_muscle_classification_v2.sql` pour actualiser uniquement les profils du catalogue commun intégré. Transaction idempotente, garde ID + nom, aucune suppression, aucun changement de signature/identité, aucune donnée personnelle touchée. Le client sait lire le catalogue ancien avant cette intervention. Ne pas rejouer les migrations SQL antérieures pour cette refonte. L’accès à une production et la synchronisation réelle entre deux appareils doivent être vérifiés séparément ; les tests locaux ne les prouvent pas.


## Fichiers et vérifications

- Classification et calculs : `muscles.js`, `volume.js`, `radar.js`.
- Interfaces et icônes : `app.js`, `volume-dashboard.js`, `volume-list.js`, `radar-ui.js`, `pictograms.js`.
- Bibliothèque : `catalogue.js`, `exercise-catalogue.js`, `assets/library/muscle-classification-v2.json`, `scripts/build-exercise-library.py`. Les profils révisés survivent à la génération ; les migrations déjà publiées ne sont plus réécrites par ce générateur.
- PWA : version du cache dans `sw.js`.
- Tests : `tests/muscle-migration.cjs`, `tests/muscle-migration-ui.cjs`, `tests/muscle-migration-db.cjs`, adaptations de `tests/radar.cjs`, `tests/session-radar-ui.cjs`, `tests/muscle-ui.cjs`, `tests/volume-dashboard.cjs`, `tests/volume-dashboard-ui.cjs` ; scripts dans `package.json`.

Validation : build navigateur Safari 16 via esbuild et configuration publique valides. Suite ciblée `test:muscle-classification` valide. Test PostgreSQL v2 et intégration SQL complète de bibliothèque valides sur PostgreSQL 17 local isolé. Suite générale : 109 scripts exécutés ; après corrections et reprises ciblées, 100 passent et 9 échouent dans des parcours généraux. Les échecs restants sont consignés dans `muscle-classification-v2-tests.json`. Les tests simulés de synchronisation passent ; aucune synchronisation de production n’est prétendue.

État de la première livraison : déploiement retenu et aucune migration de production effectuée à ce stade. Voir la finalisation ci-dessous pour le statut actuel.

Les 9 échecs restants ont tous été reproduits avec les mêmes erreurs sur le commit d’origine `1fb38cc`, servi séparément sur le port 4174 (helpers et données de la version d’origine). Ils ne sont pas corrigés ici afin de respecter le périmètre fonctionnel demandé. Ce constat de première livraison est remplacé par la qualification et le déploiement ci-dessous, autorisés explicitement dans la demande de finalisation.

## Finalisation en production — 14 novembre 2026

Base intégrée : `83456d8` (séances libres et nouveaux radars), sans retrait de ces fonctionnalités. Chevauchement des nouveaux libellés corrigé avec les abréviations compactes existantes ; les légendes conservent les noms complets. Le test du journal utilise le graphique compact réellement publié et vérifie explicitement les trois points à 60 kg : 8, 9 et 10 répétitions, sans réduire la vérification.

Le bilan précédent est remplacé par la nouvelle campagne de 111 scripts. Voir le JSON de résultats : reprises ciblées incluses. Les erreurs de sélecteurs performance/mensurations/communauté/exploration et le test de maquettes sont déjà présents sur `1fb38cc`. Les trois écarts supplémentaires organisation, sélecteur d’exercices et hauteur des séances sauvegardées sont également reproduits sur le `83456d8` publié, avec les mêmes dépendances. Ils concernent des attentes de navigation/présentation antérieures ; les parcours dédiés récents (profil, historique, exercices, séances libres, création, bibliothèque, objectifs et radars) sont validés. La liste se parcourt par défilement sur les petits écrans. Aucune assertion défaillante n’a été supprimée ni test désactivé.

SQL de production appliqué et vérifié : 32 champs `definition.muscleClassificationV2` ajoutés. Les champs `muscles` d’origine restent inchangés pour les anciens clients. Le nouveau client lit le champ v2 uniquement pour les définitions communes, jamais pour remplacer un profil personnel. Aucun schéma métier, clé, signature, politique RLS ni donnée personnelle n’a été modifié. Aucun trigger non interne sur `common_exercises`.

Sauvegarde récupérable : 266 définitions communes, restaurées exactement en base locale isolée ; SHA256 du fichier avant migration : `7ac1cb75b7efbc08c353cb3b41c63acda5301124c05b2fd490d844b9032952df`. Copie serveur durable : `elan_migration_backups.muscle_classification_v2`, aucun droit d’accès anon/authenticated/service_role. Copie locale privée : `/workspace/private-backups/elan-muscles-v2/`. Les sources utilisateur ne sont pas dans le périmètre d’écriture et n’ont pas été exportées.

Retour arrière testé : `supabase/rollback/muscle_classification_v2.sql`, exécuté manuellement avec un rôle administrateur ; restaure uniquement les définitions correspondant encore exactement à la migration et préserve les modifications concurrentes. Le backup est conservé. Frontend : republier le commit `83456d8` si nécessaire ; le SQL additif peut rester en place car les anciens clients ignorent ce champ. Ne pas exécuter le rollback comme une migration automatique.

Validation production avant publication : authentification réelle et synchronisation bidirectionnelle sur deux clients Supabase indépendants, uniquement avec un compte de test dédié. Séance, séries, références, modèle et objectifs anciens/nouveaux relus sans altération. Le RPC public de bibliothèque conserve le profil historique et fournit le champ v2 ; le nouveau client lit correctement les trapèzes supérieurs. Les clients sont isolés mais ne constituent pas deux iPhone physiques.


## Résultat publié

Frontend fonctionnel publié sur `main`, commit applicatif `3dbe53d0f79703639cad5cbac08e000fa6846c75` ; workflow Pages `43620646701` réussi. URL : https://mmassot31-byte.github.io/suivi-musculation/ .

Après publication, deux contextes Chromium iPhone 390 × 844 distincts, connectés réellement au compte de test, retrouvent la séance cloud, les trapèzes supérieurs et les pictogrammes identiques ; aucune erreur JavaScript bloquante ni débordement horizontal. Une nouvelle séance libre avec exercice privé a été créée, validée, terminée, enregistrée sur Supabase, puis retrouvée identique dans le deuxième contexte (charge et répétitions incluses). Les confirmations et sauvegardes sont respectées dans ce parcours, sans modifier les données d’autres utilisateurs. Les deux comptes temporaires ont été supprimés après vérification. Les compteurs globaux retrouvent les valeurs observées avant test : 8 profils, 8 documents privés, 27 exercices personnels et 274 performances. La classification v2 et le backup restent en place.

PWA : `elan-shell-muscles-v2-final` publié ; les 161 URL de précache répondent HTTP 200. Les tests locaux hors connexion et de mise à jour du shell passent. L’installation et la reprise hors ligne de deux PWA sur iPhone physiques ne sont pas vérifiées ici.

Bilan final : 111 scripts de la suite générale exécutés, 100 réussites après reprises ciblées et 11 attentes anciennes encore en échec, toutes reproduites sur les versions de référence. Parmi les 9 échecs initiaux, le test du journal des exercices est corrigé pour le graphique compact actuel, en conservant des assertions fortes (points exacts à charge égale et parcours complet d’édition/suppression/reprise). Les 8 autres demeurent des attentes de navigation/présentation obsolètes. Trois échecs supplémentaires sont hérités des deux évolutions déjà publiées (`83456d8`) : organisation, nombre de choix et hauteur des trois premières lignes. Le timer a passé sa reprise isolée ; le chevauchement radar issu de l’intégration a été corrigé, puis testé. Aucune assertion n’a été supprimée pour masquer un problème.

Tests additionnels réussis : migration PostgreSQL rejouée, rollback/restauration et re-migration, restauration exacte de la sauvegarde de production en base locale isolée, RLS et intégration SQL bibliothèque, build Safari 16, authentification et sync réelle bidirectionnelle, parcours publié de nouvelle séance privée, radars 320/390/430 et séances libres.

Conclusion : application utilisable normalement ; aucune régression bloquante identifiée dans la refonte. La suite générale n’est pas intégralement verte : les limites précises restent visibles dans le rapport JSON.

Vérification manuelle restante sur appareils physiques : ouvrir la PWA sur A puis B après rechargement, se connecter au même compte de test, enregistrer un shrug sur A, vérifier la séance et le volume supérieur sur B ; passer A hors ligne, enregistrer une modification, reconnecter A puis vérifier B. Utiliser uniquement un compte de test et le supprimer ensuite.

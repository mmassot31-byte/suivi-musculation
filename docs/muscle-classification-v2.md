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

Déploiement retenu tant que la suite générale n’est pas entièrement verte, conformément au critère demandé. Aucune migration ni écriture de données de production exécutée.

Les 9 échecs restants ont tous été reproduits avec les mêmes erreurs sur le commit d’origine `1fb38cc`, servi séparément sur le port 4174 (helpers et données de la version d’origine). Ils ne sont pas corrigés ici afin de respecter le périmètre fonctionnel demandé. Le déploiement reste non effectué puisque la condition « tous les tests existants passent » n’est pas satisfaite.

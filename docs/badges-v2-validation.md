# Validation de la livraison V2

Branche : `feat/badges-v2-complete`. Référence V1 initiale : `be5553b5b4c02429f3fa9104dfa648408173a666`. Vérifications exécutées uniquement dans l’environnement local isolé.

## V2

- `npm run test:badges-v2` : **26 tests réussis, 0 échec**. Catalogue, 48 volumes et 48 performances aux bornes exactes, 2/3 répétitions, conventions et variantes, tonnage/unilatéral/livres, dates, neuf rangs, corrections, défis, absence de double crédit, Secrets/prospective, objectifs figés, collection sans cycle, fusion et historique ancien sans heure de fin.
- `npm run test:badges-v2:local` : **3 tests d’intégration SQL réussis, 0 échec**. Trois documents/six séances synthétiques, quatre migrations V2 rejouables, propriétaires et RLS, interdiction d’écrire ses XP, préférences/publication de profil opt-in, verrous et trois recalculs concurrents ; hash SHA-256 des données/fonctions V1 vérifiées identique.
- Base SQL jetable : 19 migrations V1 sans avatars + 4 V2 ; vraies synchronisations V1 et corrections V2. Score saisonnier `52 → 30 → 0 → 30`, récompenses de badges uniques et mois archivé conservés. Nom et UUID marqueur contrôlés avant suppression de cette seule base créée par le test. Base principale `elan_social` inchangée pour les données V1.
- `npm run test:badges-v2:ui` : **4 parcours navigateur réussis** : application réelle 320/390/430 px, Secrets/favoris/récapitulatif sans doublon et mouvement réduit ; profil public et saison via REST/RPC locales ; contrôleur authentifié via JWT local et vraies RPC ; vrai service worker, cache des modules V2 et rechargement hors ligne.
- `npm run test:local-safety` : refus des URL, fetch et connexions PostgreSQL non locales confirmé.
- WebKit : lancement tenté, binaire absent dans l’environnement. Safari physique/PWA iOS reste non vérifié ; aucune émulation Chromium n’est présentée comme une validation Safari.

## Suite V1 complète

**108 cibles exécutées : 89 réussites, 13 échecs, 6 expirations.** Le test global `npm test` reste en échec ; aucun test non passant n’a été neutralisé pour obtenir un bilan vert. Le runner complet poursuit après une erreur et conserve les codes de sortie. Les six expirations ont été réessayées avec une limite de 180 secondes et une gestion de groupe de processus.

Les tests de fixtures réseau utilisent désormais des origines HTTP loopback au lieu de domaines fictifs HTTPS incompatibles avec la CSP locale. Les assertions métier de ces fixtures restent identiques. La permission Chromium Local Network Access est accordée aux seules origines locales de test, sans désactiver la sécurité web ni modifier la CSP de production. Les tests de rang, smoke et PWA V1 correspondants passent.

Deux échecs ont été reproduits avec l’`app.js` original du commit de départ injecté par le fixture existant, V2 désactivée : `body-calendar.cjs` attend `#body-metric` et `ergonomics.cjs` attend `performance-detail`. Cette preuve ne permet pas d’attribuer automatiquement les autres échecs au code de départ. Ils restent à qualifier/corriger avant publication.

| Cible non passante | Résultat | Première observation |
|---|---|---|
| `node tests/body-calendar.cjs` | Échec | locator.waitFor: Timeout 30000ms exceeded. |
| `node tests/muscle-ui.cjs` | Échec | locator.click: Timeout 12000ms exceeded. |
| `node tests/ergonomics.cjs` | Échec | locator.evaluate: Timeout 30000ms exceeded. |
| `node tests/volume-ui.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/chains-ui.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/reliability.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/volume-mobile.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/manual-session-ui.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/feedback-ui.cjs` | Expiration (180 s) | N’aboutit pas dans le délai imparti |
| `node tests/friend-profiles-ui.cjs` | Échec | locator.evaluate: Timeout 30000ms exceeded. |
| `node tests/seven-updates-ui.cjs` | Échec | locator.waitFor: Timeout 30000ms exceeded. |
| `node tests/friends-community-ui.cjs` | Échec | locator.waitFor: Timeout 30000ms exceeded. |
| `node tests/notifications-ui.cjs` | Échec | locator.click: Timeout 10000ms exceeded. |
| `node tests/activity-social-ui.cjs` | Échec | AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal: |
| `node tests/mockups-ui.cjs` | Échec | locator.evaluate: Timeout 30000ms exceeded. |
| `node tests/home-compact-ui.cjs` | Échec | locator.evaluate: Timeout 30000ms exceeded. |
| `node tests/volume-dashboard.cjs` | Échec | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| `node tests/profile-compact-ui.cjs` | Échec | AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal: |
| `node tests/performed-exercises-ui.cjs` | Échec | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |

Les métadonnées complètes sont dans `badges-v2-v1-results.json`. Pour reproduire : `npm run test:v1:regressions` avec le serveur local 4173 en mode PWA décrit dans `badges-v2-delivery.md`. Les journaux bruts restent sous `test-results/v1-regressions/` lors d’une réexécution (non suivis par Git).

## État de livraison

**Non prêt pour publication contrôlée.** Les fonctionnalités V2 sont livrées et testées localement, mais les cibles V1 non passantes, Safari/iOS et le provisionnement futur du job serveur privé doivent être traités avant activation. Les noms Performance et certaines raretés sont des propositions explicites dans `badges-v2-catalogue.md`.

Aucune migration ou écriture Supabase hébergée, fusion de `main`, activation V2 en production ou publication Pages n’a eu lieu. Les quatre migrations V2 ont été exécutées seulement sur les bases locales vérifiées. Le flag est désactivé par défaut ; retour V1 documenté sans suppression de ses données. La seule écriture distante est la sauvegarde des commits sur la branche GitHub dédiée, demandée par l’utilisateur.

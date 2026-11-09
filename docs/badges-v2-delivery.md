# Livraison V2 — architecture et exploitation

Référence lue intégralement : PDF joint « Élan — Cahier des charges complet : badges V2, XP, rangs et saisons », version corrigée du 9 novembre 2026 (7 pages). Extraction conservée dans `badges-v2-spec.md`. Le catalogue détaillé et les propositions sont dans `badges-v2-catalogue.md`. Les fondations de l'étape 5 sont conservées ; leur document historique ne décrit pas les récompenses désormais définies.

## Composants

- `badges-v2/catalog.js` : 150 IDs inchangés, conditions, noms, descriptions, raretés et XP. Les 48 noms Performance sont marqués `new_proposal`, les raretés sans correspondance historique `proposal`.
- `volume.js` : calcul direct existant et progression, conservés. `families.js` : associations explicites de variantes et anciens IDs, sans recherche approximative de libellé.
- `engine.js` : rétrocalcul chronologique des six catégories, XP d'activité, neuf rangs, événements, progression, preuves et réconciliation. `time.js` : mois et semaines ISO à partir du calendrier local du fuseau configuré.
- `server/v2-projector.cjs` : calcul serveur depuis les documents privés, reçus et résultats de défis V1. Aucune projection client n'est acceptée comme total d'XP public. `server/v2-worker.cjs` : tâche serveur désactivée par défaut.
- `migrations/001–004` : exclusivement tables et RPC `v2_*`, droits et RLS propres. Aucune fonction, table, donnée ou règle V1 réécrite ; aucun déclencheur ajouté à V1.
- `ui.js`, `style.css`, `flags.js` : Tableau de chasse, six catégories, filtres, grille à trois colonnes, fiches, Secrets masqués, favoris, profils, saison et récompenses de fin de séance. SVG inline, aucun asset distant. Animation unique d'arrivée et jauge avant/après ; mouvement réduit respecté.
- `merge.js` : conservation des récompenses et choix lors des imports/conflits. Intégration additive dans l'application et le cache PWA. Le workflow de préparation Pages copie les fichiers publics V2 ; aucune publication n'est lancée.

## Source de vérité, corrections et idempotence

Le document historique V1 n'est pas modifié par le projecteur. Les écritures V2 sont transactionnelles et protégées par un verrou consultatif par propriétaire. Clés uniques `(owner_id,badge_id)`, `(owner_id,event_key)` ; une séance contribue par un événement agrégé dont le nombre de séries est dédoublonné par exercice et identifiant de série. Les anciennes séries sans ID utilisent leur position, sans conversion destructive de l'historique. Une séance conservée dans l'historique V1 sans horodatage de fin garde ses séries et son crédit historique ; le mois utilise alors sa date de séance, explicitement marquée `historical_session_date`. Aucune heure de fin, durée ou date d'obtention n'est inventée pour les Secrets ou badges qui l'exigent.

**Politique de recalcul proposée et implémentée :**

1. XP d'activité et de défis : projection de la preuve actuellement valide. Une correction ou suppression autorisée peut réduire ces XP et le rang associé. Le score d'un ancien mois est corrigé dans le même sens. Aucun reset mensuel des XP permanents.
2. Badges déjà acquis : permanents. Leur XP initial ne peut être attribué une seconde fois, même si un recalcul ultérieur ne satisfait plus la condition ou si une séance est supprimée puis réimportée. Les favoris restent acquis. Cette politique est explicite ; elle ne prétend pas être une décision historique retrouvée.
3. Un défi révoqué/perdant ne conserve pas de points d'activité ; son reçu de première attribution reste archivé pour qu'une révalidation ne déplace pas artificiellement ses points dans un autre mois. Les nouveaux gains de défis rétroactifs sont datés à leur première attribution vérifiée par le projecteur, pas à une date historique supposée.
4. Les XP de badge n'entrent jamais dans une saison. Les mois déjà observés restent consultables même si une correction ramène leur score à zéro.
5. Le backfill utilise le même projecteur et les mêmes clés que les synchronisations ordinaires. Aucun « bonus de migration ». Une ancienne séance ouverte affiche ses récompenses historiques sans animation de nouvel événement.

Le backend lit les résultats définitifs `goal_won` (coopération `together`) et les mêmes prédicats définitifs que `challenge_list` (`completed`, `win`, participant concerné, non provisoire), sans la limite de 100 lignes de cette RPC d'interface, sans réécrire leurs règles. Les objectifs `each`/`personal` ne sont pas arbitrairement requalifiés en défis compétitifs. Les cas que ces preuves ne couvrent pas ne donnent pas de récompense inventée.

## Preuves et limites reconstructibles

- Volumes : les profils enregistrés par série/exercice priment. Les profils personnels et défauts historiques connus complètent seulement les profils absents. Brachial et abducteurs gardent le regroupement hebdomadaire d'Élan. Faisceaux d'épaule réunis par série, sans crédit secondaire. Une classification inconnue reste exclue et signalée.
- Charge : valeur saisie, au moins 3 répétitions. Aucune multiplication des records et aucune conversion supposée de machine. Les conventions incertaines sont signalées comme non comparables. Le tonnage connu utilise la normalisation existante ; faute de preuve de côtés, la valeur brute est conservée sans multiplication supposée ; une unité explicitement en livres est convertie en kilogrammes pour le seul tonnage métrique, jamais réécrite dans les séries. Les anciens modes un seul côté/alterné sont signalés comme non comparables aux nouvelles conventions.
- Records et progression : logique existante `sessionRecap`/`setProgression`, mêmes références et conventions. La première observation est une référence, pas une amélioration. Les séries invalides, futures, échauffements et séances non terminées sont exclues. Une séance cardio validée compte pour la régularité, sans inventer des séries de force ni le bonus de 20 XP. Tour du propriétaire suit les muscles connus principaux et secondaires affichés par Élan.
- Extra-série et hors ligne : nouveaux instantanés de plan à l'ouverture et état réseau à la fin, conservés au premier reçu serveur. Aucun backfill d'une preuve absente. Mode avion exige aussi la réception effective par le serveur.
- Objectifs hebdomadaires : définition des cibles/objectifs figée au premier entraînement suivi de la semaine, puis conservée dans le reçu. Les succès sont recalculés depuis les séances et les définitions capturées, jamais depuis un booléen « gagné » fourni par le client. Sans snapshot historique, aucun de ces badges n'est inventé. Quatre semaines complètes sont nécessaires pour Semaine parfaite.
- Collection : passe finie ordonnée, sans auto-preuve circulaire. Les récompenses permanentes antérieures comptent aussi.
- Fuseau : Europe/Paris par défaut explicite, réglable dans le profil V2. Un changement demande un recalcul ; il peut déplacer une activité entre mois. Les snapshots d'objectifs restent liés à leur période capturée.
- Les données de séance restent déclaratives comme dans Élan V1. Les reçus protègent contre une réécriture après réception ; ils ne prétendent pas attester cryptographiquement une charge réellement soulevée ou l'état physique du réseau de l'appareil.

## Sécurité et retour arrière

Flag navigateur **désactivé par défaut**. Pour tester uniquement sur l'origine locale, définir `localStorage.setItem('elan-badges-v2','enabled')` puis recharger. Retirer cette clé et recharger restaure les lectures V1. Aucun onglet principal ajouté.

Les profils V2 publics sont opt-in ; les données brutes, objectifs et preuves privées sont exclus des RPC publiques. Les blocages sociaux existants s'appliquent aux profils et saisons. Les clients peuvent demander un recalcul et choisir trois favoris acquis ; ils ne peuvent écrire ni événements, ni XP, ni attributions. Les classements partagent la place à égalité et gardent un ordre stable par UUID.

Arrêter le worker et désactiver le flag suffit au retour V1. Conserver les tables V2 pour une reprise sans perdre les récompenses ; ne pas lancer de suppression de données en guise de rollback. La branche de livraison ne doit pas être fusionnée avant revue.

## Démarrage et vérifications locales

Utiliser le checkout isolé existant, sans créer de worktree. Ne pas remplacer une ressource locale absente par un service hébergé.

```sh
npm run local:v2:migrate
npm run local:v2:refresh
npm run local:v2:worker   # processus séparé, à relancer dans un nouveau runtime
npm run local:gateway
npm run local:app        # port 4174, CSP locale stricte
ELAN_TEST_APP_PORT=4173 ELAN_LOCAL_PWA=1 node scripts/social-app-testserver.cjs
npm run test:badges-v2
npm run test:badges-v2:local
npm run test:badges-v2:ui
npm run test:v1:regressions
```

Les scripts vérifient le socket Docker local, le label `elan.local-test=true` et la publication PostgreSQL sur `127.0.0.1:55432`. La base synthétique est `elan_social`. Les migrations V2 sont suivies avec SHA-256 et verrou ; une migration appliquée puis modifiée est refusée.

Le test de corrections SQL crée une base jetable `elan_v2_verify_<timestamp>` sur ce même conteneur. Il vérifie son nom et un marqueur UUID avant sa suppression. Les migrations V1 de cette base excluent les avatars (sans Storage) ; la base synthétique principale conserve ses 20 migrations V1 avec Storage. Aucun test destructif n'est dirigé vers la base principale ou vers une destination distante.

Le PWA réel est testé sur un serveur loopback dédié avec CSP `connect-src 'self'` et configuration cloud vide. L'exception `ELAN_LOCAL_PWA_ORIGIN` autorise le SW uniquement pour ce parcours local explicite ; le garde-fou bloque toujours les URL non locales. Le contexte Chromium accorde la permission Local Network Access uniquement aux origines loopback 4173/4174 et à l'origine PWA locale vérifiée ; cette autorisation de test ne modifie pas la CSP. Le test V1 de rang utilise désormais des fixtures HTTP locales et garde la CSP de production intacte. Le smoke suit le journal actuel, préserve les assertions de données et vérifie le vrai rechargement hors connexion.

Les résultats détaillés de la suite V1 sont écrits dans `test-results/v1-regressions/`; chaque cible est exécutée, même après un échec. Un timeout reste un échec, jamais un succès ni un test désactivé.

## Avant toute publication contrôlée

Aucun accès en écriture au Supabase hébergé ni déploiement n'a été exécuté. Les scripts locaux ne possèdent aucune bascule vers une cible distante.

Le worker serveur de livraison exige `ELAN_V2_WORKER_ENABLED=true` et un binding serveur privé `ELAN_V2_DATABASE_URL` ; ces valeurs ne sont jamais lues par le navigateur et ne sont pas configurées ici. Le pilote `pg` est une dépendance de production du job Node, verrouillée à la version déjà utilisée par les tests. Une erreur de document est isolée par propriétaire ; le job ne retente pas une version invalide sans modification ou nouvelle demande. Son rôle doit pouvoir lire les preuves V1 et maintenir les seules projections V2. Ne pas installer une clé privilégiée dans `cloud-config.js`.

Une future publication nécessite la revue des migrations/RLS, le provisionnement du job serveur et de son accès privé, un backfill contrôlé, la revue des propositions de noms/raretés et la résolution ou qualification des échecs V1 relevés. La présence de la branche et les tests locaux ne signifient ni migration hébergée, ni activation, ni publication.

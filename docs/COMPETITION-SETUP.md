# Activation des classements et défis

L’interface et les fonctions locales sont utilisables sans cette opération. Les nouvelles comparaisons publiques et les défis restent fermés tant que le serveur ne confirme pas leur disponibilité. Aucun script n’a été exécuté sur votre projet Supabase pendant le développement.

## Sur votre PC

1. Depuis **Paramètres → Exporter JSON** sur votre téléphone, conservez une sauvegarde de vos entraînements. Ne videz pas le stockage Safari et ne désinstallez pas l’application.
2. Ouvrez [Supabase](https://supabase.com/dashboard), puis votre projet Élan. Si vous utilisez déjà la base, conservez également votre sauvegarde habituelle de la base.
3. Ouvrez **SQL Editor → New query**.
4. Ouvrez [le script de mise à jour](https://github.com/mmassot31-byte/suivi-musculation/blob/main/supabase/migrations/202611050004_competition.sql), cliquez **Raw**, puis copiez tout son contenu dans cette nouvelle requête.
5. Cliquez **Run**. Cette mise à jour suppose les tables déjà installées par le précédent script Élan (migrations 001, 002 et 003). **Ne réexécutez pas INSTALL.sql sur une base existante.** En cas d’erreur, conservez son message ; la transaction empêche une installation partielle.
6. Dans une nouvelle requête, exécutez :

   ```sql
   select public.competition_capabilities();
   ```

   Le résultat doit contenir `"version": 1`, `"completedOnly": true` et `"challenges": true`.
7. Fermez puis rouvrez Élan, connectez-vous et ouvrez **Classement**. Les sections Classements et Défis s’activent automatiquement. Aucun secret ni clé d’administration ne doit être ajouté dans le site.

## Conventions et anciennes données

Les anciennes séances restent conservées. Dans la fiche d’un exercice, **Convention de charge** permet de régler les prochaines séances ou de confirmer explicitement une plage de dates passée. Les nombres saisis ne sont jamais doublés ni divisés. Une confirmation peut être annulée ; en cas de confirmations superposées, annulez la plus récente d’abord.

Les variantes publiques doivent correspondre exactement au matériel et à la convention. Les variantes d’haltères initiales décrivent un mouvement bilatéral simultané : les côtés inconnus ou unilatéraux ne sont pas assimilés à cette variante. Les machines restent hors compétition. Une performance peut donc rester dans votre historique personnel sans apparaître au classement.

Sans la migration, les documents contenant des performances sportives restent en attente sur l’appareil au lieu d’être envoyés à l’ancien projecteur public. Elles restent sauvegardées localement. Après migration, la synchronisation reprend automatiquement : les brouillons restent privés et seules les performances admissibles de séances terminées alimentent les comparaisons publiques.

## Ce que fait la mise à jour

Elle ajoute une projection publique minimale et des fonctions contrôlées côté serveur. Elle ne réécrit ni les documents privés, ni les identifiants, ni les charges. Elle retire de l’ancienne projection publique les séries actives et révoque l’accès direct à ses lignes brutes. Les anciennes interfaces publiques utilisent désormais uniquement les données terminées et admissibles.

Les défis sont nominatifs : le jeton expirant ne dispense pas d’utiliser le compte invité. L’invitation expire après sept jours ; la période de sept ou quatorze jours commence à l’acceptation. Une tentative doit avoir été enregistrée dans une séance terminée et reçue par le serveur pendant cette période. Une synchronisation tardive ne peut pas antidater cette réception. Les résultats restent provisoires jusqu’à l’échéance ; corrections et suppressions invalident ou recalculent les résultats. Aucune saisie manuelle de score n’existe. Les performances restent déclarées, sans preuve physique des répétitions.

## Vérifications

Tests PostgreSQL isolés : `node tests/competition-db.cjs` (PostgreSQL local sur 55432 ; aucune connexion de production). Tests d’interface : `npm run test:evolution`, avec `npm start` actif. Service worker réel : `node tests/premium-offline.cjs`.

Sur iPhone, vérifier Safari puis le mode installé : saisie numérique, grand repos, ouverture/retour d’une fiche pendant une séance, réouverture hors connexion et reprise. Ces vérifications physiques ne sont pas remplacées par les tests de largeur de navigateur.

Le point Git `restore/elan-before-functional-v3-20261105` conserve l’interface précédente. Un retour du code peut être fait par de nouveaux commits, sans effacer l’historique Git ni les données d’entraînement. Ne supprimez pas les nouvelles tables pour revenir à l’ancienne interface.

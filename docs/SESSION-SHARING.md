# Fiches programmées et partage de séances

La carte Entraînement et son titre ouvrent la fiche programmée. Les boutons musculaires conservent leur détail, et Commencer conserve son lancement direct. Le menu de la fiche propose les actions personnelles existantes. Le rendu reprend les classes de `saved-session.css`, les pictogrammes et le radar de l’historique. Les séries prévues sont adaptées au moteur radar existant, sans autre moteur musculaire.

`session-sharing.js` contient la présentation programmée et le sélecteur d’amis. `app.js` gère la navigation. `notifications.js` conserve les invitations et encouragements existants et ajoute une liste paginée de séances reçues, y compris lues. `account-store.js` coordonne la synchronisation et l’import atomique de la copie personnelle.

## Migration

SQL exact : `supabase/migrations/202611140021_session_sharing.sql`. Appliquer après les migrations existantes, y compris `202611140001_muscle_classification_v2.sql`, avec le SQL Editor Supabase ou l’outil habituel de migration. Le script comporte une transaction. Ne pas réexécuter intégralement sur un projet où les objets existent déjà.

La migration a été appliquée au projet configuré `jiqerlmwsxitdouxpgsg` le 14 novembre 2026, avant publication. Aucune clé privée n’a été ajoutée au client. Pas d’étape SQL manuelle restante pour ce projet.

Les RPC vérifient `auth.uid()`, la propriété du modèle et l’amitié acceptée pour tout le lot. Les instantanés sont immuables côté client ; aucun INSERT/UPDATE/DELETE direct n’est accordé sur `session_shares`. La politique SELECT n’autorise que le destinataire et respecte les blocages. Le retrait d’amitié seul ne révoque pas une réception existante.

Une ligne `session_shares` constitue aussi la notification persistante : UUID, expéditeur, destinataire, date, état lu, programme versionné, identifiant et date de copie enregistrée. L’envoi déduplique un identifiant de requête conservé lors des nouvelles tentatives. L’enregistrement verrouille le partage et le document privé, contrôle la version et ajoute un seul modèle. Une réponse perdue peut être redemandée sans seconde copie. Les exercices personnels reçoivent une nouvelle identité de catalogue dans la copie.

La projection serveur exclut séries réalisées, anciennes références de performance, activité enregistrée, brouillons, chronomètres, records et mensurations. Seules les références explicitement marquées comme cibles sont transmises. Les définitions embarquées permettent l’affichage sans accès au catalogue privé de l’expéditeur. Les paramètres cardio, préparations, conventions et séquences asymétriques sont conservés.

## Validation

- `npm run test:session-sharing` : PostgreSQL isolé réel (droits, RLS, confidentialité, déduplication, indépendance, groupes, exercices personnalisés et import idempotent) et Chromium mobile (fiche, lancement direct, sélection multiple, erreur réseau et double clic).
- Tests supplémentaires passants : notifications état/UI, radar, groupes et groupes asymétriques, séances libres après intégration des changements de production, repos après adaptation de la navigation.
- `npm run build:cloud`, vérification de configuration publique et contrôles de syntaxe JavaScript : réussis. Aucun script lint n’est configuré.
- `npm test` ne passe pas : arrêt sur `smoke.cjs`, bouton `performance-detail` absent. Même échec reproduit sur le commit initial. Exécution complémentaire des 75 tests suivants : 59 réussites et 16 échecs, incluant des assertions anciennes de navigation et de mise en page. Le contrôle de hauteur de `saved-session-ui.cjs` échoue aussi sur la branche de production sans cette fonctionnalité. Ces échecs ne sont ni masqués ni supprimés. La liste détaillée figure dans `session-sharing-validation.json`.

Les tests navigateur utilisent des données isolées et des services simulés ; les tests SQL créent une base temporaire supprimée après exécution. Aucun partage de test n’a été envoyé aux utilisateurs réels. La recette complète avec deux comptes réels et la safe area/VoiceOver sur iPhone physique restent à effectuer.

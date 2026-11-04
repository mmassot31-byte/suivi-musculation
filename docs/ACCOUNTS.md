# Comptes, profils publics et classement

## État livré

L’interface reste une application statique sur GitHub Pages. Elle utilise le SDK officiel Supabase (`@supabase/supabase-js`, version verrouillée dans package-lock.json), regroupé localement dans `vendor/supabase.js` pour éviter une dépendance CDN et préserver le chargement hors connexion.

**Aucun projet Supabase de production n’a été fourni ou provisionné.** `cloud-config.js` est volontairement vide. Le parcours local reste opérationnel ; l’avatar donne accès aux paramètres, et les pages de comptes/classement indiquent que le service n’est pas activé. Aucun faux compte ni classement simulé n’est présenté aux utilisateurs.

Les tests d’intégration utilisent réellement PostgreSQL 17, Supabase Auth / GoTrue 2.186.0, PostgREST 13.0.7, Supabase Storage 1.25.7 et Mailpit 1.27.9, sur les ports locaux seulement. Ils ne prouvent pas qu’un projet hébergé est déjà configuré.

## Mise en service, pas à pas

1. Créer un compte sur **https://supabase.com/dashboard**, puis un **New project**. Le mot de passe de base de données demandé par Supabase reste dans Supabase ; ne pas l’envoyer dans le chat ni l’insérer dans le dépôt.
2. Dans le projet, ouvrir **SQL Editor → New query**, copier le contenu de **`supabase/INSTALL.sql`**, puis cliquer Run une seule fois dans un projet neuf. Ce fichier regroupe ces trois migrations, dans l’ordre :
   - `supabase/migrations/202611040001_accounts.sql` ;
   - `supabase/migrations/202611040002_avatars.sql` ;
   - `supabase/migrations/202611040003_machine_variants.sql`.
   Dans une installation pilotée par le CLI Supabase, employer les migrations avec `supabase db push` à la place de l’exécution manuelle. Ne pas utiliser les scripts `local-*` en production.
3. Dans **Authentication → URL Configuration**, définir le **Site URL** à `https://mmassot31-byte.github.io/suivi-musculation/` et autoriser cette même URL dans les redirect URLs. Garder l’authentification e-mail et la confirmation d’e-mail activées, un minimum de 8 caractères et les protections de débit. Les liens de confirmation et de récupération reviennent à cette adresse ; le SDK gère l’échange PKCE et le renouvellement des sessions.
4. Pour des inscriptions publiques, configurer un **SMTP transactionnel** dans les paramètres Auth de Supabase, avec un expéditeur/domaine vérifié. Le service e-mail intégré de développement est limité et ne constitue pas un service de production ouvert à tous. Le mot de passe ou la clé du fournisseur SMTP reste exclusivement dans le tableau de bord Supabase.
5. Dans **Connect / API Keys**, relever uniquement l’URL du projet et sa **publishable key** (ou l’ancienne clé **anon**). Ce sont des paramètres publics. Les renseigner dans `cloud-config.js` :

   ```js
   export const cloudConfig = {
     url: 'https://IDENTIFIANT.supabase.co',
     publishableKey: 'sb_publishable_…'
   };
   ```

   **Ne jamais employer `service_role`, `sb_secret_*`, le JWT secret ou le mot de passe PostgreSQL.** Le client et le contrôle de déploiement refusent les clés d’administration reconnues. Aucun secret n’est nécessaire dans GitHub Pages.
6. Publier la modification de configuration sur `main`, attendre le succès du workflow Pages, puis effectuer la recette ci-dessous. Le bucket `avatars` est créé par la deuxième migration : public en lecture, écriture dans le dossier UUID du propriétaire seulement, JPEG/PNG/WebP, 2 Mo maximum.

Pour poursuivre avec l’assistant, il suffit de fournir l’**URL et la clé publique** après création du projet. Le déploiement de l’interface est indépendant de l’activation réelle du service.

## Données et isolation

- Le document historique `main` reste intact lorsqu’il est rattaché pour la première fois. Chaque source locale reçoit un UUID et un propriétaire dans une transaction IndexedDB ; son original est conservé séparément avant tout envoi. Le pointeur invité passe alors à un espace neuf. Une connexion avec un autre compte ne reprend jamais l’ancienne source.
- Les documents et métadonnées sont stockés dans `account:<UUID>` et `account:<UUID>:meta`. Une sauvegarde capture cette clé avant d’être mise en file. Le changement de compte attend les écritures locales ; la session SDK et les variables de l’interface sont rechargées. Les comptes ne partagent ni historique, ni modèles, ni mensurations, ni brouillons. Les nouveaux exports JSON portent le propriétaire du compte ; une restauration sous un autre compte est refusée. Les anciens fichiers sans propriétaire restent compatibles.
- Les sources invitées créées ultérieurement sont elles aussi rattachées individuellement au premier compte qui les revendique. Des modèles initiaux simplement affichés, sans données ou réglages personnels, ne provoquent pas un nouvel import de modèles à chaque connexion.
- Le serveur conserve l’original dans `legacy_imports`, dont la clé primaire interdit le rattachement d’une source à deux comptes. L’original local n’est pas effacé après confirmation. L’import est confirmé seulement après la transaction serveur, et les renvois ne créent pas de doublon.
- L’avertissement avant inscription/connexion indique l’import automatique et la publicité des anciennes/nouvelles performances. Aucune étape séparée de publication n’est demandée.
- Les modèles, séances, dates, identités personnelles, références, groupes, réglages, saisies brutes et mesures restent dans le document privé. Le brouillon de création de modèle est aussi conservé par compte. Les collisions à la jonction de deux historiques sont archivées intégralement dans le privé ; les modèles différents ayant le même identifiant deviennent des copies explicites. Des séances ayant le même UUID ne sont pas dupliquées. Le profil personnel permet d’exporter les archives et de reprendre un brouillon mis de côté lorsqu’aucune séance n’est en cours.
- Les identifiants personnels d’exercice ne deviennent pas automatiquement des variantes comparables entre personnes. La projection publique emploie des clés locales hachées ; les identifiants originaux restent dans le privé.

## Synchronisation et concurrence

La transaction IndexedDB reste la confirmation de sauvegarde pendant l’entraînement. Une génération locale durable marque le compte « En attente de synchronisation ». Les envois sont regroupés après la saisie, déclenchés au retour du réseau et à la réouverture, puis repris avec temporisation en cas de panne. Les classements utilisent exclusivement le résultat d’une transaction serveur terminée.

`sync_snapshot` vérifie le propriétaire authentifié, verrouille son document et compare une version. L’écriture du privé, le rattachement de la source et le recalcul de la projection/records sont atomiques. Une confirmation réseau perdue est reconnue par comparaison canonique du document serveur et du document envoyé ; la file reprend sans dupliquer les séries ou l’import.

Un véritable conflit entre deux versions modifiées sur deux appareils n’est pas résolu par un écrasement silencieux. Les deux copies sont conservées ; Mon profil propose d’exporter les deux versions puis de choisir explicitement la version de l’appareil ou du serveur. Cette résolution concerne les données, pas un choix de rendre publiques les performances. Les instantanés privés sont limités à 20 Mo ; il ne s’agit pas d’une synchronisation différentielle par série.

Le SDK gère la session, le mot de passe, la confirmation et la réinitialisation. Hors réseau, une identité déjà conservée par le SDK peut ouvrir son cache privé même si le jeton doit être renouvelé. Elle ne donne aucun droit serveur supplémentaire : les requêtes privées vérifient l’identité du jeton SDK et figent ce jeton pour la requête. La déconnexion supprime la session locale, y compris si la révocation réseau ne répond pas ; les copies privées par compte restent sur l’appareil.

## Public / privé et règles d’accès

`profiles` expose uniquement UUID, pseudo, chemin d’avatar et date de création. Le pseudo est unique sans distinction de casse. Une personne ne peut modifier que son propre pseudo/chemin d’avatar. L’e-mail et le mot de passe restent dans Supabase Auth.

`private_documents` et `legacy_imports` n’autorisent la lecture qu’au propriétaire par RLS. Les écritures directes ne sont pas accordées au client ; `sync_snapshot` utilise exclusivement `auth.uid()`, sans paramètre de propriétaire. Les fonctions à privilèges fixent leur search_path, leurs droits d’exécution et leurs références de tables.

`performances`, `absolute_bests` et `rep_bests` ne contiennent que des données sportives publiques. Ils sont lisibles et jamais modifiables directement par le navigateur. Une projection serveur autorisée transforme les instantanés privés. Elle ne copie ni e-mail, ni poids corporel, ni mensurations, ni notes, ni RIR, ni modèles, ni brouillons de saisie non validés. Les séries déjà validées d’un brouillon d’entraînement conservé restent des performances réelles ; elles ne deviennent pas du tonnage de séance terminée.

La troisième migration permet de référencer une machine par exercice, marque, modèle exact et convention. Deux modèles ou deux conventions produisent deux variantes distinctes. Les variantes et les correspondances sont déclaratives : elles ne prouvent pas l’équivalence mécanique ni la véracité d’une charge. La configuration se fait dans Mon profil, jamais dans la saisie d’entraînement. Une convention incertaine nécessite une confirmation explicite, sans réécriture des anciennes charges privées.

## Calcul des deux records

- **Charge max** : maximum d’une charge réellement enregistrée sur du travail validé, séance active ou terminée. Les étapes dégressives validées sont des charges réellement enregistrées ; leur détail est indiqué dans les performances récentes. Aucune estimation de 1RM, conversion, multiplication par côté ou par haltère.
- **Tonnage** : maximum, pour une personne et une variante, de la somme charge × répétitions dans **une seule séance terminée**. Les étapes dégressives enregistrées sont incluses une seule fois ; les échauffements, références, séries prévues et brouillons non validés ne le sont pas. `80×10 + 80×8 + 75×8 = 2040`.
- Une séance active ne fournit que des charges validées. Sa clôture ne l’ajoute pas une seconde fois. Une correction, suppression ou un abandon reconstruit les contributions de son propriétaire dans la même transaction.
- Une variante canonique comporte matériel et convention. Les aliases automatiques sont stricts et limités. Les machines non référencées/conventions ambiguës restent visibles sur le profil mais hors classement. Les familles génériques ne fusionnent pas les identités de machines.
- Les deux cartes restent des records **absolus** de la variante. Le filtre « 8 reps » change seulement la liste Charge. La liste ne contient qu’une meilleure ligne par personne ; les égalités partagent le même rang (rang de compétition : 1, 1, 3). Le bloc donne accès aux codétenteurs.

`rankings` renvoie les deux cartes, une page (25 lignes, maximum serveur 50), le total et le rang personnel. Les index portent sur variante/type/valeur/propriétaire et variante/répétitions/valeur. Le profil expose au plus 50 groupes de records et des pages de 20 performances récentes ; le téléphone ne télécharge pas tous les profils et leurs historiques. Le catalogue initial est volontairement restreint, extensible et borné côté client.

## Reproduire les tests

Préconditions : Node ≥20, npm, Chromium/Playwright et Docker local. `npm ci`, puis `npm run build:cloud` reconstruit le SDK et ses licences ; la version déjà livrée est utilisable directement sur Pages.

1. Lancer PostgreSQL de test uniquement :
   ```sh
   docker run -d --name elan-accounts-test -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55432:5432 postgres:17-alpine
   ```
2. `node scripts/local-social.cjs` prépare Auth, PostgREST et Mailpit. `--reset` efface **uniquement** la base nommée `elan_social` de ce PostgreSQL local ; arrêter les conteneurs Auth/REST avant un reset. Ne pas l’exécuter contre un service de production.
3. `node scripts/local-avatars.cjs` prépare le stockage et les politiques. Lancer `node scripts/social-gateway.cjs` et `node scripts/social-app-testserver.cjs` dans deux sessions. Les ports sont 55433/55434/55435/55436/55437 et 4174, sur loopback. Les secrets de test générés restent dans `/tmp/elan-social-test.json`, jamais dans le dépôt ni la configuration de production. Mailpit capture les e-mails : aucun destinataire réel n’est contacté.
4. `npm run test:accounts:sql` vérifie les vraies règles PostgreSQL et les classements. `npm run test:accounts:live` effectue le parcours navigateur/API/SMTP contre les services réels. `node tests/account-data.cjs` couvre les fusions, sources et brouillons. `npm test` vérifie aussi les anciens parcours locaux (serveur `npm start` sur 4173).

## Recette iPhone et mode installé

Ces points nécessitent un iPhone physique et le projet hébergé activé :

1. Faire une sauvegarde JSON. Dans Safari, inscrire A et confirmer son e-mail ; vérifier l’import automatique et le statut de synchronisation. Fermer/réouvrir et contrôler la session et le groupe en cours.
2. Installer via Partager → Sur l’écran d’accueil. Refaire le parcours de connexion et de mot de passe oublié. Un lien e-mail peut s’ouvrir dans Safari, dont le stockage peut différer de celui de l’application installée : après confirmation, revenir dans l’application et se connecter par mot de passe si nécessaire. Ne pas supposer que PKCE ou les données locales passent automatiquement entre ces contextes iOS.
3. En mode avion, saisir/valider une série, fermer/réouvrir, reprendre le brouillon, puis remettre le réseau. Vérifier « En attente de synchronisation », puis l’apparition unique du record confirmé.
4. Déconnecter A, connecter B sur le même téléphone : aucune note, mesure, séance ou modèle personnel de A ne doit apparaître chez B. Revenir à A, puis consulter son profil comme visiteur déconnecté.
5. À 390 px, vérifier les cinq onglets, les deux cartes de record, les grands chiffres et pseudos longs, les ex æquo et le clavier dans les formulaires. Tester aussi photo, zones de sécurité, retour d’arrière-plan et VoiceOver.

Chromium, même avec un écran ou un user-agent iPhone, ne valide pas Safari iOS ni une installation réelle sur iPhone. Aucun test physique ni envoi d’e-mail par un fournisseur de production n’est revendiqué sans exécution.

## Résultats de cette livraison

Vérifications exécutées dans l’environnement cloud, le 4 novembre 2026 :

- `tests/accounts-db.cjs` : succès sur PostgreSQL réel, deux comptes et un rôle anonyme, records distincts, 2040 kg, ex æquo, filtre exact, rang, pagination et limite serveur, variantes/machines distinctes, conservation de l’import, conflits et refus des accès adverses.
- `tests/social-live.cjs` : succès contre Auth, PostgREST, Storage et Mailpit réels. Inscription/confirmation, import automatique ancien, perte de confirmation après écriture, session conservée, avatar public et écriture adverse refusée, saisie hors ligne, réouverture avec expiration locale, retour réseau, deux comptes sur le même stockage, visiteur, records, correction/suppression et récupération du mot de passe.
- `tests/account-data.cjs` et `scripts/check-public-config.cjs` : succès. Fusions, sources, brouillons archivés et rejet des clés d’administration vérifiés.
- Les scripts de la suite locale ont été exécutés. Un ancien enregistrement dont certains exercices n’avaient pas de tableau de séries a révélé une erreur de compteur ; les séries absentes sont désormais traitées comme vides, et le test de suppression a été relancé avec succès. Les parcours restant de chrono, accueil 320/390 px et groupes asymétriques ont également été relancés avec succès.
- Le rendu du classement et des cinq onglets à 390 px a été examiné sur une capture Chromium. Les tests iPhone physique/Safari et installation iOS restent **non exécutés**. Une tentative d’installation/lancement par CDP Chromium a répondu, mais `display-mode: standalone` est resté faux : elle n’est donc pas comptée comme une validation en mode installé.

Aucun service de production, SMTP de production ou inscription sur le site publié n’est déclaré vérifié tant que `cloud-config.js` est vide et que les migrations n’ont pas été appliquées au projet hébergé.

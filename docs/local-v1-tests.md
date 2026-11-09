# Environnement local V1 pour préparer la V2

Aucune commande ci-dessous ne déploie l'application ou ne contacte Supabase hébergé.
Prérequis : Docker local opérationnel et suffisamment d'espace disque (plusieurs Go
pour les images et leurs couches inscriptibles), Node et dépendances du lockfile.
Ne pas remplacer un service manquant par une connexion distante.

```sh
npm run local:start
npm run local:seed
npm run local:verify
npm run test:local-safety
npm run test:season
```

`local:start` crée PostgreSQL 16, GoTrue, PostgREST, Mailpit et Storage,
liés exclusivement à 127.0.0.1 sur les ports 55432–55437. Les migrations du dépôt
sont appliquées dans l'ordre, avatars compris ; empreintes SHA-256 et suivi
transactionnel dans `elan_local.migrations`. Une migration déjà appliquée puis
modifiée est refusée. Aucune règle V1 n'est réécrite.

`local:seed` refuse les utilisateurs autres que ses trois UUID synthétiques.
Il prépare six séances passées, séries de travail/échauffement, améliorations,
badges dérivés, un objectif partagé confirmé et une invitation de séries.
Les dates de réception des preuves synthétiques sont ajustées uniquement pour
exercer la confirmation historique. Aucun export utilisateur réel n'est utilisé.
`local:verify` contrôle les migrations et les fonctions V1 ; ses écritures sont
annulées par rollback. Les autres tests peuvent créer/supprimer des bases locales.

Pour l'application de test, dans deux terminaux :

```sh
npm run local:gateway
npm run local:app
```

Ouvrir http://127.0.0.1:4174 dans un profil navigateur de test vierge.
Le serveur injecte uniquement les clés locales, impose une CSP locale et bloque
le service worker ; `cloud-config.js` et l'interface de production sont inchangés.
Ne pas utiliser `npm start` pour les parcours connectés de test.

Réinitialisation destructive du seul environnement synthétique :

```sh
npm run local:reset
npm run local:seed
npm run local:verify
```

Le reset retire Auth/REST/Storage locaux puis recrée `elan_social` ; les données
Storage de test sont jetables. Arrêter les serveurs HTTP séparément si nécessaire.
Ne pas lancer les scripts internes avec des paramètres ou identifiants distants.
Les commandes npm de test préchargent `local-safety.cjs` dans leurs sous-processus :
connexions Node distantes refusées, URLs locales strictes, navigation Playwright
filtrée et service workers désactivés. Les exécutions directes de tests historiques
avec `node tests/...` ne constituent pas le chemin sécurisé ; utiliser npm.
Les variables Docker de redirection sont ignorées au profit du socket local.
Les outils de provisionnement échouent si un service manque ; aucune bascule distante.

État de validation initial : démarrage bloqué à Storage par l'espace disque
Docker épuisé. PostgreSQL/Auth/REST/Mailpit démarrés, migrations applicatives et
fixtures non exécutées. Il faut résoudre ce blocage avant d'affirmer la parité V1.
Les migrations reflètent le dépôt ; la concordance avec la production n'est pas
vérifiée par ces commandes.

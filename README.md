# Élan · Suivi de musculation

Application personnelle en français, adaptée au téléphone. JavaScript natif, sans dépendance applicative, sans compte et sans serveur de données.

## Lancer

Depuis le dépôt, avec Python 3 :

```sh
npm start
# ou : python3 -m http.server 4173 --bind 0.0.0.0
```

Ouvrir le port 4173 dans le navigateur de développement. Ne pas ouvrir index.html directement : les modules et le mode hors connexion nécessitent HTTP. Node n'est nécessaire que pour les commandes npm et les tests.

## Mettre en ligne

Ce projet est entièrement statique. Le workflow `.github/workflows/pages.yml` publie les fichiers publics à chaque push sur `main`. GitHub Pages doit utiliser la source **GitHub Actions** (Settings → Pages). Le workflow tente également l'activation automatique ; selon les droits du jeton GitHub Actions, cette activation peut nécessiter un premier réglage administrateur.

Adresse prévue : https://mmassot31-byte.github.io/suivi-musculation/ (à considérer disponible uniquement après un déploiement réussi). Le statut exact est visible dans l'onglet Actions du dépôt, workflow « Déployer Élan sur GitHub Pages ». Aucune compilation ni clé applicative n'est nécessaire. Les séances restent sur l'appareil ; seul le code et les références initiales sont publiés.

Sur iPhone, ouvrir cette adresse dans Safari puis Partager → Sur l'écran d'accueil. Attendre le premier chargement avec réseau pour le cache hors connexion. L'icône SVG est fournie ; le rendu de l'icône d'accueil dépend de la version d'iOS.

## Données et fonctionnement

- Quatre programmes complets ; les charges initiales ne sont jamais proposées dans la saisie ni affichées comme repères. La dernière séance enregistrée fournit les repères de charge et répétitions ; sans historique, la charge reste à renseigner. Aucune séance fictive n'est créée.
- Charge, répétitions, correction, suppression annulable, RIR, notes, échauffement, étapes dégressives et repos facultatif.
- Séance en cours et modèles sont des copies indépendantes. L'alternative Hip thrust / Glute bridge garde deux identités distinctes.
- L'identité d'exercice détermine le regroupement des statistiques. Modifier cette identité pour une autre machine ou variante. Le nombre de séries prévues reste propre à chaque modèle. Aucune multiplication automatique des charges.
- IndexedDB conserve un document versionné (`version: 1`). Les écritures sont séquentielles et transactionnelles. Les mises à jour du cache de l'application ne suppriment pas la base.
- Export JSON complet, import validé et fusion par identifiant. Un identifiant déjà présent est conservé localement : l'import ne remplace pas les corrections existantes. Un fichier avec une autre séance active est refusé tant que la séance locale n'est pas terminée. Le CSV inclut les étapes dégressives et les échauffements identifiés.
- Les graphiques excluent échauffements et valeurs non validées. Les étapes dégressives de travail sont incluses ; le volume est présenté comme indicateur complémentaire. Les points ouvrent la séance correspondante. Tous les exercices de la séance sont accessibles dans une liste défilante et peuvent être réalisés dans l’ordre souhaité. La croix près de « Terminer » permet d’abandonner la séance après confirmation, sans modifier l’historique.
- JSON à exporter régulièrement : ni GitHub, ni le cache hors connexion ne sauvegardent vos séances à distance. L'effacement du stockage du navigateur, un changement de domaine ou d'appareil ne transfèrent pas les données. Importer le JSON sur la nouvelle installation.
- Usage prévu sur un seul onglet/appareil à la fois ; pas de fusion concurrente ni de synchronisation distante. Le minuteur est visuel, sans notification garantie en arrière-plan.

## Tests

```sh
npm start
npm test
```

Le test nécessite `playwright` disponible pour Node et Chromium à `/usr/bin/chromium` (adapter le chemin à votre système). Pour une machine distincte : installer Playwright dans l'outillage de test, sans dépendance de production. Les tests créent un contexte navigateur isolé, sans toucher aux données personnelles.

Parcours testés : charge avec virgule, répétitions, correction, changement d'exercice, rechargement/reprise, fin de séance, détail historique, graphiques, export/réimport sans doublon, choix Glute bridge, suppression annulée, largeur mobile 390 px et rechargement hors connexion. La validation sur un iPhone physique avec son clavier et son mode installé reste à effectuer ; l'émulation Chromium ne reproduit pas le clavier iOS.

Pour une évolution du format de données, ajouter une migration explicite avant de modifier la version IndexedDB ou le schéma d'import ; ne jamais effacer la base pour mettre à jour l'application. Modifier le nom du cache dans sw.js lors d'une nouvelle livraison des ressources.

## Supersets

Pendant la séance, « Créer un superset » associe deux exercices existants, un exercice existant et un nouveau, ou deux nouveaux exercices. Le duo apparaît dans un bloc commun avec deux accès A/B. Chaque validation d’une nouvelle série de travail ouvre le partenaire ; une correction ou un échauffement ne change pas d’exercice. Si le repos automatique est activé sur l’un des exercices, il démarre après les deux séries d’un tour, avec le repos le plus long du duo. Les charges, les séries et les statistiques restent séparées.

« Dissocier » conserve tous les exercices et leurs séries. Les duos sont propres à la séance, sont conservés après rechargement et dans l’export JSON, et apparaissent dans le détail historique. Les anciens exports sans superset restent compatibles ; le champ optionnel `superset` relie exactement deux exercices sans changer le format version 1.

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

- Quatre programmes complets ; chaque série propose sa dernière performance comparable (même identité et convention), ou sa référence initiale non datée si aucune performance comparable n’est disponible. Sans repère, les champs restent à renseigner. Les valeurs proposées ne deviennent des séries qu’après validation. Aucune séance fictive n'est créée.
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

## Activité, tonnage et suivi corporel

L’historique affiche un calendrier mensuel (semaine du lundi au dimanche), les séances de chaque date et le tonnage de chaque séance. La moyenne hebdomadaire correspond aux séances des 28 derniers jours, aujourd’hui compris, divisées par quatre. Les compteurs utilisent les séances terminées avec au moins une série ; deux séances le même jour comptent deux fois. Les dates sont celles de l’appareil, avec prise en compte des changements de mois, d’année et d’heure.

Le tonnage additionne charge × répétitions de toutes les séries de travail, étapes dégressives comprises, sans compter les échauffements. Les exercices d’un superset restent indépendants. Les valeurs suivent les conventions saisies, sans multiplication par haltère ou côté : comparer des séances similaires. Le détail des séances et la progression affichent aussi cet indicateur, recalculé après correction.

L’onglet **Corps** conserve des relevés datés de poids et de tours corporels. Tous les champs sont facultatifs, avec au moins une valeur positive par relevé. Une date possède une seule fiche, modifiable ou supprimable après confirmation. Les courbes montrent chaque mesure à sa date, avec une échelle adaptée et des périodes de 1, 3, 6 mois ou tout l’historique. Les dernières valeurs conservent leur propre date même lorsque les différentes zones ne sont pas mesurées le même jour.

Le document version 1 reçoit la collection facultative `bodyMeasurements` : `{id, date: "YYYY-MM-DD", values: {weight, waist, ...}}`. Son initialisation à `[]` est une migration additive et idempotente pour les documents anciens ; aucune base n’est supprimée. L’export JSON contient les relevés. Importer un ancien fichier sans cette collection conserve les mesures locales. En cas de conflit d’identifiant ou de date, la fiche locale reste prioritaire et le doublon est ignoré. Un CSV distinct des mensurations est disponible dans l’onglet Corps. Les données restent locales, sans synchronisation distante.

`npm test` couvre aussi les calculs de tonnage et fréquentation, les dates limites et changements d’heure, les relevés partiels, leurs courbes et exports, la compatibilité des anciennes sauvegardes, les conflits d’import, le calendrier et la conservation hors connexion. Le déploiement statique et le service worker incluent `tracking.js`.

## Séries par muscle

Dans **Progression → Volume par muscle**, sélectionner une semaine du lundi au dimanche donne les séries principales et les sollicitations secondaires de chaque muscle, avec le détail par exercice/séance et les huit semaines précédant la semaine sélectionnée (celle-ci comprise). Les séances en cours ont un bilan en direct dans leur propre écran ; elles rejoignent le bilan hebdomadaire lorsqu’elles sont terminées. **Performances**, vue d’entrée de Progression, conserve les courbes par exercice. Le tonnage global est dans **Historique → Bilan des séances** avec sa propre période.

Une série de travail validée compte une fois pour chacun de ses muscles principaux et séparément pour ses muscles secondaires. Les échauffements sont exclus. Une dégressive reste une seule série, quel que soit son nombre d’étapes ; les deux exercices d’un superset comptent indépendamment. Ne pas additionner les lignes des muscles pour retrouver le nombre total de séries. Les colonnes principales et secondaires n’ont pas d’équivalence chiffrée ; aucune pondération arbitraire ni plage de volume « optimale » n’est imposée.

Chaque exercice possède des associations modifiables dans la séance, les modèles, l’historique ou le répertoire **Progression → Exercices et muscles**. Le répertoire est recherchable par nom d’exercice ou muscle. Les propositions initiales sont liées aux identités connues, sans déduction automatique à partir des noms libres. Elles restent générales et modifiables selon le mouvement et l’équipement ; une back extension non précisée ou un exercice inconnu reste explicitement à classer. Ses séries sont signalées et ne sont jamais affectées silencieusement à un muscle.

Le document version 1 reçoit la collection facultative `exerciseMuscles` (`exerciseId`, `primary`, `secondary`) et chaque exercice conserve son instantané `muscles` (`primary`, `secondary`). La migration additive remplit seulement les associations absentes, y compris les alternatives, sans modifier les séances ni les séries. Une correction générale actualise les modèles et la séance active du même équipement ; les séances passées gardent leurs instantanés sauf si l’option rétroactive est cochée. Une correction faite directement dans une séance ne concerne que cette occurrence. Les identités distinctes gardent leurs profils indépendants.

JSON conserve profils et instantanés ; les anciens exports restent compatibles. Les imports refusent les muscles inconnus, doublons et rôles contradictoires, et préservent les profils locaux en cas de conflit. `npm test` vérifie les semaines aux frontières d’année et d’heure d’été, les séries principales/secondaires, l’exclusion des échauffements, les dégressives/supersets, les corrections rétroactives ou isolées, les imports et le fonctionnement mobile/hors connexion. Le module `muscles.js` est inclus dans le service worker et le déploiement statique.

## Saisie et lecture des performances

La saisie propose la dernière série comparable du même rang (identité d’équipement et convention identiques, hors échauffement). Si la dernière séance ne contient pas ce rang, une séance antérieure peut fournir le repère. À défaut, la référence non datée de ce rang est proposée. Une référence manquante n’est jamais remplacée par la précédente ; les nouveaux rangs créés comme objectifs portent `placeholder: true`, et les exercices créés sans références utilisent `refsAreTargets: true`. Ces métadonnées facultatives évitent de transformer un objectif de séries en performance initiale inventée. Seule la validation ajoute une série. Les brouillons de saisie survivent aux changements d’interface au sein de la page ; ils ne constituent pas des séries enregistrées.

Les corrections de séance et d’historique réutilisent les mêmes commandes numériques et les champs type, RIR, notes et dégressives. L’historique utilise un panneau intégré, sans `prompt`. Annuler conserve les séries ; dans la séance, le brouillon antérieur à la correction est également restauré. L’enregistrement recalcule les vues depuis les séries sauvegardées.

**Progression** s’ouvre sur **Performances** : exercice/période, dernière performance et records, charges, répétitions à charge égale, puis volume de l’exercice. **Volume par muscle** et **Exercices et muscles** restent disponibles séparément. Les filtres sont conservés lorsqu’un point ouvre une séance puis que l’on revient par « Progression ». Le tonnage global est regroupé dans **Historique → Bilan des séances**, avec sa propre période et son propre filtre de programme. Le calendrier est repliable et fermé à l’ouverture.

Terminer une séance complète ou partielle affiche un bilan : exercices, séries de travail, charges/répétitions, exercices non réalisés et différences factuelles entre séries comparables. Aucun progrès n’est déduit du seul tonnage. Le champ facultatif `endedAt` conserve la fin réelle ; la durée écoulée inclut les pauses. Les anciennes séances sans ce champ restent compatibles. Corriger leur date conserve l’intervalle de durée lorsqu’il existe.

**Corps** propose « Ajouter mon poids » (date et poids uniquement) et « Ajouter des mensurations » (formulaire complet). Une pesée sur une date existante actualise seulement le poids, en conservant les autres mesures de cette fiche. Une moyenne mobile optionnelle utilise les pesées disponibles du jour et des 13 jours calendaires précédents, sans zéros pour les jours manquants. Le nombre de jours mesurés est affiché ; une mesure unique n’est pas présentée comme une tendance. Les doublons de date sont ignorés à l’import en faveur de la fiche locale ; si des doublons existent déjà dans des données anciennes, le calcul retient explicitement la première pesée de chaque date sans supprimer les données. Les pesées brutes et les exports restent disponibles.

Les tests ergonomiques couvrent références non datées, variations entre séries, propositions après une véritable séance, brouillons, annulation/correction, retour des graphiques, bilans complets et partiels, saisie rapide, moyenne avec jours manquants et doublons, préservation des mensurations, anciennes sauvegardes et mode hors connexion. Le clavier mobile est simulé par une fenêtre réduite avec champs focalisés ; la validation sur iPhone physique reste distincte.

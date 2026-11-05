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
- Charge, répétitions, correction, suppression annulable et repos facultatif. Les anciennes séries conservent leurs métadonnées (RIR, notes, échauffement et dégressives).
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

## Groupes d’exercices

« Grouper des exercices » est disponible dans les modèles et dans une séance. Le parcours principal se prépare dans les modèles : choisir les exercices et l’ordre, conserver le même enchaînement à chaque tour (superset à deux ou triset à trois), ou choisir un exercice commun et des associés successifs. Les quantités et l’aperçu des tours sont visibles avant enregistrement. Le groupage ponctuel reste accessible dans « Adapter la séance ».

Pour 4 séries d’élévations et deux associés de 2 séries chacun, le mode variable produit exactement A→B, A→B, A→C, A→C. Les quantités doivent correspondre ; « Aligner le commun sur les associés » propose une correction explicite. En mode fixe, des quantités différentes donnent des tours plus courts, signalés et montrés avant confirmation. Chaque exercice conserve ses propres références, réglages, performances et statistiques.

Pendant l’entraînement, le lecteur montre le tour, l’exercice courant, sa saisie et l’étape suivante. Les tours et les réglages secondaires sont repliés. On peut passer une étape sans la valider, la reprendre, corriger une étape terminée, sortir temporairement du groupe et travailler librement. Corriger ou supprimer une série ne déplace pas le curseur ; annuler la suppression restaure la même série. Les étapes non faites restent accessibles, même si des étapes plus avancées ont été réalisées.

La configuration et les changements de nombre prévu dans un groupe passent par un aperçu avant confirmation. Les étapes déjà liées à des séries gardent leur identité ; celles qui sortent du nouveau plan sont conservées comme étapes réalisées hors de l’enchaînement. Modifier un groupe en séance ne change pas son modèle ; « Appliquer aussi au modèle » est explicite et conserve les anciennes séances. Dissocier conserve tous les exercices et leurs séries. Le nombre prévu et les compteurs ne sont jamais augmentés à partir de simples étapes programmées.

Le repos entre exercices est facultatif et nul par défaut, le repos de fin de tour est réglable. Aucun repos long individuel ne démarre automatiquement au milieu d’un groupe ; le minuteur ne bloque pas les validations. Son échéance est stockée en timestamp pour continuer après retour d’arrière-plan ou rechargement. Les variantes sans série peuvent être permutées dans un groupe si leur nombre prévu reste identique ; une variante qui change les quantités se prépare avant le groupage, ou après dissociation, pour éviter de modifier silencieusement les étapes.

## Activité, tonnage et suivi corporel

L’historique affiche un calendrier mensuel (semaine du lundi au dimanche), les séances de chaque date et le tonnage de chaque séance. La moyenne hebdomadaire correspond aux séances des 28 derniers jours, aujourd’hui compris, divisées par quatre. Les compteurs utilisent les séances terminées avec au moins une série ; deux séances le même jour comptent deux fois. Les dates sont celles de l’appareil, avec prise en compte des changements de mois, d’année et d’heure.

Le tonnage additionne charge × répétitions de toutes les séries de travail, étapes dégressives comprises, sans compter les échauffements. Les exercices d’un superset restent indépendants. Les valeurs suivent les conventions saisies, sans multiplication par haltère ou côté : comparer des séances similaires. Le détail des séances et la progression affichent aussi cet indicateur, recalculé après correction.

L’onglet **Corps** conserve des relevés datés de poids et de tours corporels. Tous les champs sont facultatifs, avec au moins une valeur positive par relevé. Une date possède une seule fiche, modifiable ou supprimable après confirmation. Les courbes montrent chaque mesure à sa date, avec une échelle adaptée et des périodes de 1, 3, 6 mois ou tout l’historique. Les dernières valeurs conservent leur propre date même lorsque les différentes zones ne sont pas mesurées le même jour.

Le document version 1 reçoit la collection facultative `bodyMeasurements` : `{id, date: "YYYY-MM-DD", values: {weight, waist, ...}}`. Son initialisation à `[]` est une migration additive et idempotente pour les documents anciens ; aucune base n’est supprimée. L’export JSON contient les relevés. Importer un ancien fichier sans cette collection conserve les mesures locales. En cas de conflit d’identifiant ou de date, la fiche locale reste prioritaire et le doublon est ignoré. Un CSV distinct des mensurations est disponible dans l’onglet Corps. Les données restent locales, sans synchronisation distante.

`npm test` couvre aussi les calculs de tonnage et fréquentation, les dates limites et changements d’heure, les relevés partiels, leurs courbes et exports, la compatibilité des anciennes sauvegardes, les conflits d’import, le calendrier et la conservation hors connexion. Le déploiement statique et le service worker incluent `tracking.js`.

## Séries par muscle

Dans **Progression → Volume**, sélectionner une semaine du lundi au dimanche donne les séries principales et les sollicitations secondaires de chaque muscle, avec le détail par exercice/séance et les huit semaines précédant la semaine sélectionnée (celle-ci comprise). La séance active contribue par ses seules séries validées ; sa clôture ne les recompte pas et son abandon retire sa contribution. Aucun réglage musculaire n’est ajouté à la saisie en séance. **Performances**, vue d’entrée de Progression, conserve les courbes par exercice. Le tonnage global est dans **Historique → Bilan des séances** avec sa propre période.

Une série de travail validée compte une fois pour chacun de ses muscles principaux et séparément pour ses muscles secondaires. Les échauffements sont exclus. Une dégressive reste une seule série, quel que soit son nombre d’étapes ; les deux exercices d’un superset comptent indépendamment. Ne pas additionner les lignes des muscles pour retrouver le nombre total de séries. Les colonnes directes et secondaires restent distinctes. Les nouveaux repères utilisent une estimation pondérée, détaillée ci-dessous, sans prétendre définir un volume optimal individuel.

Chaque exercice possède des associations modifiables dans les modèles, l’historique ou le répertoire **Progression → Exercices et muscles**. Le répertoire est recherchable par nom d’exercice ou muscle. Les propositions initiales sont liées aux identités connues, sans déduction automatique à partir des noms libres. Elles restent générales et modifiables selon le mouvement et l’équipement ; une back extension non précisée ou un exercice inconnu reste explicitement à classer. Ses séries sont signalées et ne sont jamais affectées silencieusement à un muscle.

Le document version 1 reçoit la collection facultative `exerciseMuscles` (`exerciseId`, `primary`, `secondary`) et chaque exercice conserve son instantané `muscles` (`primary`, `secondary`). La migration additive remplit seulement les associations absentes, y compris les alternatives, sans modifier les séances ni les séries. Une correction générale actualise les modèles et la séance active du même équipement ; les séances passées gardent leurs instantanés sauf si l’option rétroactive est cochée. Une correction faite directement dans une séance ne concerne que cette occurrence. Les identités distinctes gardent leurs profils indépendants.

JSON conserve profils et instantanés ; les anciens exports restent compatibles. Les imports refusent les muscles inconnus, doublons et rôles contradictoires, et préservent les profils locaux en cas de conflit. `npm test` vérifie les semaines aux frontières d’année et d’heure d’été, les séries principales/secondaires, l’exclusion des échauffements, les dégressives/supersets, les corrections rétroactives ou isolées, les imports et le fonctionnement mobile/hors connexion. Le module `muscles.js` est inclus dans le service worker et le déploiement statique.

## Saisie et lecture des performances

La saisie propose la dernière série comparable du même rang (identité d’équipement et convention identiques, hors échauffement). Si la dernière séance ne contient pas ce rang, une séance antérieure peut fournir le repère. À défaut, la référence non datée de ce rang est proposée. Une référence manquante n’est jamais remplacée par la précédente ; les nouveaux rangs créés comme objectifs portent `placeholder: true`, et les exercices créés sans références utilisent `refsAreTargets: true`. Ces métadonnées facultatives évitent de transformer un objectif de séries en performance initiale inventée. Seule la validation ajoute une série. Les brouillons de saisie normale réellement modifiés sont conservés séparément des séries, y compris après fermeture de la page. Les simples propositions ne créent aucun enregistrement de série ; une correction non confirmée ne modifie pas la série originale.

Les corrections de séance et d’historique réutilisent les mêmes commandes numériques. En séance, seuls charge et répétitions sont exposés ; les autres métadonnées restent conservées. L’historique utilise un panneau intégré, sans `prompt`, avec les champs type, RIR, notes et dégressives des anciennes séries. Annuler conserve les séries ; dans la séance, le brouillon antérieur à la correction est également restauré. L’enregistrement recalcule les vues depuis les séries sauvegardées.

**Progression** s’ouvre sur **Performances** : exercice/période, dernière performance et records, charges, répétitions à charge égale, puis volume de l’exercice. **Volume** et **Exercices et muscles** restent disponibles séparément. Les filtres sont conservés lorsqu’un point ouvre une séance puis que l’on revient par « Progression ». Le tonnage global est regroupé dans **Historique → Bilan des séances**, avec sa propre période et son propre filtre de programme. Le calendrier est repliable et fermé à l’ouverture.

Terminer une séance complète ou partielle affiche un bilan : exercices, séries de travail, charges/répétitions, exercices non réalisés et différences factuelles entre séries comparables. Aucun progrès n’est déduit du seul tonnage. Le champ facultatif `endedAt` conserve la fin réelle ; la durée écoulée inclut les pauses. Les anciennes séances sans ce champ restent compatibles. Corriger leur date conserve l’intervalle de durée lorsqu’il existe.

**Corps** propose « Ajouter mon poids » (date et poids uniquement) et « Ajouter des mensurations » (formulaire complet). Une pesée sur une date existante actualise seulement le poids, en conservant les autres mesures de cette fiche. Une moyenne mobile optionnelle utilise les pesées disponibles du jour et des 13 jours calendaires précédents, sans zéros pour les jours manquants. Le nombre de jours mesurés est affiché ; une mesure unique n’est pas présentée comme une tendance. Les doublons de date sont ignorés à l’import en faveur de la fiche locale ; si des doublons existent déjà dans des données anciennes, le calcul retient explicitement la première pesée de chaque date sans supprimer les données. Les pesées brutes et les exports restent disponibles.

Les tests ergonomiques couvrent références non datées, variations entre séries, propositions après une véritable séance, brouillons, annulation/correction, retour des graphiques, bilans complets et partiels, saisie rapide, moyenne avec jours manquants et doublons, préservation des mensurations, anciennes sauvegardes et mode hors connexion. Le clavier mobile est simulé par une fenêtre réduite avec champs focalisés ; la validation sur iPhone physique reste distincte.

## Objectifs de séries et tableau de bord hebdomadaire

Chaque exercice affiche **Séries prévues** avec −/+. Le champ facultatif `plannedSets` (entier de 0 à 100) remplace la longueur des références comme objectif quand il est présent. À défaut, les anciens documents continuent d’utiliser `refs.length`. Modifier cet objectif ne redimensionne jamais `refs` ou `sets` : les références, les séries réalisées, les échauffements et les dégressives restent conservés. Une dégressive compte une seule série de travail ; un échauffement est identifié séparément. Le dépassement du nombre prévu n’empêche aucune validation.

En séance, l’objectif est accessible dans « Séries et options » et reste local à cette séance. **Appliquer aussi au modèle** ne change que l’objectif du même exercice dans son modèle d’origine, après une action explicite ; l’action est disponible lorsqu’une correspondance unique existe, y compris dans les alternatives. Les modèles affichent aussi −/+ hors des réglages avancés. Les variantes Hip thrust / Glute bridge et les exercices d’un superset gardent des objectifs indépendants. L’aperçu direct prévu dans le modèle décrit une seule séance, avec une variante à la fois ; un aperçu alternatif est disponible. Aucun volume hebdomadaire prévu n’est extrapolé depuis les modèles.

**Volume** compare le compteur approprié au repère : séries directes pour les anciennes cibles personnelles, estimation D + 0,5 × S pour les nouveaux repères proposés. Les séries secondaires restent séparées ; une même série ne compte jamais deux fois pour le même muscle, et une convention « par côté » ne multiplie pas son nombre. La séance en cours participe au bilan hebdomadaire à sa date locale, avec la mention « dont … en séance ». Lorsqu’elle est terminée elle remplace cette contribution sans duplication ; si elle est abandonnée, sa contribution disparaît.

Les repères sont stockés dans le moteur existant `volumeTargets` : `{muscle, effectiveDate, min, max, method?, origin?, automatic?}`. Sans `method`, une ancienne cible reste en séries directes (`direct`) ; sans `origin`, elle reste personnelle. `fractional` signifie D + 0,5 × S. Une entrée par muscle/date conserve la dernière modification de ce jour. Une entrée `min: null, max: null` retire la cible à partir de sa date sans effacer son historique. L’éditeur fixe la date d’effet au jour courant : la cible s’applique à la semaine en cours et aux suivantes, jamais aux semaines terminées. Pour une semaine passée, la cible applicable est la dernière en vigueur au dimanche ; pour la semaine courante, la dernière en vigueur aujourd’hui. Les cibles ne constituent ni des prescriptions ni des garanties de croissance musculaire.

`volumeWeeks` conserve `{week, kind, complete}` : lundi local, type `normal`, `deload`, `pause` ou `incomplete`, et confirmation explicite de complétude. Les semaines particulières, courantes, antérieures au début du suivi, sans cible ou non confirmées complètes restent exclues des statistiques de respect des objectifs. Les graphiques les conservent et distinguent les semaines sans données des semaines antérieures au suivi. La moyenne du volume enregistré utilise les semaines terminées avec données ou complétude confirmée, en affichant leur nombre ; les semaines sans information ne deviennent pas des zéros. L’observation d’un écart répété exige les trois dernières semaines consécutives terminées, normales, complètes et avec cible applicable ; toute exclusion interrompt cette suite.

Les épingles sont conservées dans `musclePins` (`muscle`, `pinned`), y compris `false` pour préserver une désactivation lors d’un réimport. Les semaines et épingles manquantes sont initialisées à vide. Les cibles reçoivent seulement les nouveaux repères absents, selon la migration datée décrite ci-dessous, sans changer IndexedDB/version 1. Elles sont validées et exportées en JSON ; les imports fusionnent par muscle/date, semaine ou muscle, en préservant les valeurs locales lors d’un conflit. Les anciennes sauvegardes restent importables sans effacer les nouveaux réglages.

`npm test` vérifie objectifs, diminutions sous le réalisé, séries supplémentaires, application explicite au modèle, variantes et supersets, aperçu prévu, complétude/semaines particulières, historique des cibles, séries actives puis terminées ou abandonnées, statistiques, absence de double comptage, JSON et fonctionnement mobile/hors connexion. `volume.js` est inclus dans le service worker et dans l’artefact GitHub Pages.

## Accueil compact et données des groupes

Les cartes de l’accueil affichent les séries directes prévues des modèles actuels, muscles principaux uniquement, sans groupes ajoutés une deuxième fois ni cumul des alternatives. Les noms restent distincts (trois parties d’épaules, dorsaux et haut du dos). Un calcul de mise en page réserve au plus deux lignes avant dépliage, avec texte de taille constante. « + N muscles » et « Commencer » sont des boutons indépendants dans une carte non interactive : déplier ne démarre pas la séance. Le détail indique les variantes et le classement incomplet. Une explication commune rappelle que ces chiffres concernent une séance et ne s’additionnent pas forcément entre muscles.

Le tableau musculaire aligne Muscle, Directes, Secondaires et Repère. Toucher une ligne ouvre le détail et le réglage de la cible, sans boutons imbriqués. Les règles longues sont regroupées dans « Comment ça fonctionne ». Après une semaine terminée, « Toutes tes séances sont-elles enregistrées ? » propose « Oui, semaine complète » et « Il manque des séances ». Aucune confirmation prématurée n’est demandée pour la semaine en cours. Ces actions ne modifient aucune séance ; les types de semaine restent dans le panneau secondaire.

La migration reste additive, avec IndexedDB/document version 1. Chaque occurrence d’exercice reçoit `instanceId`, distinct de son identité d’équipement `id`. Un conteneur (modèle ou séance) reçoit `groups` : identifiant, nom, mode, membres, exercice commun, repos et étapes. Chaque étape possède un identifiant stable, une occurrence d’exercice, un rang de série, un tour et un état pending/skipped ; sa réalisation découle exclusivement d’une série portant `groupId` et `groupStepId`. Le groupe conserve un curseur et, si nécessaire, des `retainedSteps` pour les étapes réalisées retirées du plan. Les anciennes références `superset`/`supersetStart` sont migrées sans modifier les identifiants, charges, répétitions ou notes des séries. Les séries supplémentaires existantes sont conservées.

Une nouvelle séance clone le plan du modèle avec de nouveaux identifiants d’étapes et un avancement vierge. La séance active stocke `currentExerciseKey`, `currentGroupId`, `entryDrafts` et `restUntil`. Les brouillons sont séparés par étape et variante ; ils ne participent ni à l’historique daté ni aux statistiques. Fermer puis rouvrir reprend le même curseur et les valeurs réellement saisies. La correction intégrée reste une modification à confirmer explicitement.

Les groupes et l’avancement sont inclus dans l’export JSON et validés avant tout import : références d’exercices, unicité des étapes, liaison unique série/étape, curseur et types des brouillons. Les anciennes sauvegardes sans groupes sont toujours importables et migrées. L’historique des séances expose les groupes dans des détails compacts et conserve les exercices individuels.

`npm test` couvre notamment le superset rapide, le triset, l’ordre exact 4/2/2, les références par exercice, les variantes et leurs brouillons, le passage d’une étape et sa reprise après fermeture de page, les corrections/suppressions/annulations après avancement, les modifications et dissociations sans perte, l’application explicite au modèle, les aperçus calculés de chaque modèle, les deux lignes de l’accueil, le réglage des cibles depuis le détail, les anciens imports, l’affichage 320/390 px et le mode hors connexion. Tous les scénarios navigateur utilisent des contextes isolés ; ils ne touchent pas aux données personnelles. La validation du clavier sur iPhone physique reste distincte de la simulation de fenêtre réduite.

## Ordre et saisie en séance

Dans les modèles, « Ordre de la séance » présente chaque exercice seul et chaque groupe comme un bloc unique. Le menu de position numéroté et les flèches déplacent tout le groupe, sans changer son ordre interne. Les anciens modèles utilisent la position du premier membre du groupe. Les changements concernent les futures séances ; les séances actives et l’historique restent indépendants. Cet ordre est conservé dans les sauvegardes JSON existantes, sans nouveau format.

La séance démarre au premier bloc du modèle. La dernière série prévue d’un exercice seul, ou la dernière étape d’un groupe, ouvre le bloc suivant. Le dernier bloc ne termine pas automatiquement la séance. On peut toujours choisir un autre bloc, revenir à une étape passée ou ajouter des séries supplémentaires ; une correction ne fait jamais avancer la séance.

La saisie affiche la charge, les répétitions, le dernier repère et la validation, avec les séries déjà enregistrées et les options repliées. Les réglages de siège, la classification musculaire et les champs RIR, notes, échauffement et dégressives ont été retirés de la saisie active. Les anciennes valeurs restent stockées et exportables ; une correction conserve leurs métadonnées. Les muscles se règlent dans les modèles, pas pendant la séance.


## Audit de fiabilité et repères de départ (novembre 2026)

L’audit a été réalisé sur le dépôt courant, dont HEAD était `275176ba29456080539664dda2367029382d6922`, sans retour à une ancienne version. Les identifiants des étapes, le comptage des groupes, l’exclusion des échauffements et le mécanisme d’instantanés étaient déjà présents. Les risques confirmés et corrigés concernent le verrou de validation lié au DOM, l’avancement avant confirmation d’écriture, les anciennes métadonnées de brouillon masquées, la reprise ambiguë depuis l’accueil, l’ordre DOM différent de l’ordre visuel et le déplacement du formulaire entre appui et relâchement. Une course de navigation après une attente asynchrone a également été reproduite dans le test d’écriture ralentie.

La validation prend un verrou indépendant du DOM avant toute mutation, bloque les autres actions pendant son écriture et conserve une courte protection contre le second appui après confirmation. Les écritures restent sérialisées. Le statut « enregistré » appartient à la dernière écriture demandée ; un autosave plus ancien ne peut plus annoncer la fin d’une écriture suivante. La vue n’avance et ne signale une réussite qu’après `transaction.oncomplete`. Échec ou abandon de transaction rétablit la séance et le curseur, conserve les champs saisis et propose de réessayer sans ajouter une deuxième série. Les corrections échouées sont également rétablies. Cette protection concerne les transactions de l’onglet ; l’usage multi-onglets n’est pas synchronisé.

Le bouton discret « Modifier » après validation résout la série par identifiants de séance, occurrence et série, même après changement d’exercice. Le dialogue ne déplace pas le curseur ; fermer ou enregistrer retrouve le brouillon courant. Les métadonnées masquées (type, RIR, notes multilignes, étapes dégressives) restent stockées et utilisées, y compris dans les anciens brouillons d’échauffement. Le document reste en version 1 et la base n’est jamais effacée.

Les panneaux pertinents conservent leur ouverture. La carte active apparaît en premier **dans le DOM**, sans remontée CSS distincte ; les titres reçoivent un focus sans ouverture du clavier après transition. Le dialogue de correction focalise son titre à l’ouverture. `visualViewport.height` et `offsetTop` pilotent l’espace visible lorsque le clavier réduit la vue sans réduire la fenêtre ; la navigation basse se masque et les zones de sécurité sont prises en compte. Une simulation ne valide pas les comportements natifs iOS.

### Présentation et interprétation

Le tableau n’affiche par défaut que les muscles ayant D > 0 ou S > 0, dans un ordre stable avec épingles en premier. « Tous les muscles » montre aussi les zéros. Les priorités épinglées sans série apparaissent dans « À surveiller » lorsqu’il existe des données dans la semaine. Une semaine vide reste explicitement sans données ; elle ne devient pas un bilan négatif automatique. L’accueil place après les cartes de modèles une carte « Cette semaine » limitée à trois observations ou muscles, toujours avec D et S, et un accès à Volume. Les aperçus des modèles restent du **prévu par séance**, jamais un prévu hebdomadaire extrapolé.

Une estimation de suivi est calculée par `V = D + 0,5 × S` : 8 directes et 6 secondaires donnent 11. Une sollicitation secondaire ne vaut pas physiologiquement toujours une demi-série directe. Les classifications existantes ont été examinées : développés → triceps/épaule avant, tirages → biceps, etc. sont des associations pratiques dépendantes de la technique et de l’équipement, pas des mesures de recrutement individuelles. Les back extensions inconnues restent à classer ; les instantanés et corrections de l’utilisateur ne sont pas réécrits par cet audit. Les séries non classées sont signalées et excluent les recommandations de répétition d’écart pour éviter de traiter un volume inconnu comme nul.

Pendant la semaine, les lignes indiquent « Semaine en cours », sans alerte négative pour un minimum non atteint. Après une semaine normale terminée et confirmée complète, le compteur cohérent avec la méthode du repère donne « Dans le repère », « Sous le repère » ou « Au-dessus du repère ». Les semaines allégées, de pause, incomplètes ou sans repère ne permettent pas de recommandation automatique. Les observations sur trois semaines exigent trois semaines consécutives normales et complètes, une méthode et une fourchette cohérentes, sans série non classée. Au plus trois observations sont présentées, épingles d’abord. Un léger ajustement n’est évoqué que conditionnellement à une progression stagnante et une bonne récupération. Aucun programme n’est modifié automatiquement.

### Configuration proposée, non résultats démontrés par muscle

Ces **Repères de départ** reposent sur des recherches générales sur le volume, complétées par des choix pratiques. Les besoins individuels varient. Les fourchettes ci-dessous portent sur **V**, pas sur les seules séries directes.

| Muscle | Minimum V | Maximum V |
| --- | ---: | ---: |
| Pectoraux | 12 | 18 |
| Grands dorsaux | 12 | 18 |
| Haut du dos | 10 | 16 |
| Épaules latérales | 12 | 18 |
| Épaules arrière | 8 | 14 |
| Épaules avant | 6 | 12 |
| Biceps | 10 | 16 |
| Triceps | 10 | 16 |
| Quadriceps | 10 | 16 |
| Ischio-jambiers | 8 | 14 |
| Fessiers | 10 | 16 |
| Mollets | 8 | 14 |
| Abdominaux | 6 | 12 |
| Trapèzes | 6 | 12 |
| Avant-bras | 6 | 12 |
| Adducteurs | 6 | 12 |

Lombaires : comptage conservé, sans cible automatique ni recommandation d’augmentation ; une cible personnelle reste possible. Les valeurs des petits groupes et subdivisions sont particulièrement extrapolées. Les repères plus élevés pour pectoraux, dorsaux et épaules latérales reflètent les priorités de l’utilisateur, pas la preuve d’un besoin systématiquement supérieur.

Références contextuelles demandées :

- [ACSM 2026 — PMID 41843416](https://pubmed.ncbi.nlm.nih.gov/41843416/).
- [Pelland et al. — relation dose-réponse et comptage fractionné, PMID 41343037](https://pubmed.ncbi.nlm.nih.gov/41343037/).
- [Baz-Valle et al. 2022 — PMID 35291645](https://pubmed.ncbi.nlm.nih.gov/35291645/).

Ces publications ne sont **pas** présentées comme démontrant les fourchettes exactes configurées muscle par muscle. Elles ne garantissent ni croissance ni résultat individuel ; un dépassement ne prouve pas un excès et une valeur inférieure peut permettre une progression.

### Migration et sauvegardes

`volumeReferenceActivation: {version: 1, date}` rend l’activation idempotente. Un premier démarrage ajoute un repère `method: "fractional", origin: "preset", automatic: true` daté du jour pour chaque muscle qui ne possède aucune cible existante, y compris une désactivation explicite. Les anciennes cibles restent inchangées, avec leur méthode directe implicite et leur date. Aucun ancien dimanche précédant l’activation n’est réinterprété. Le changement est valable dans la semaine courante et les suivantes, sans modifier les performances.

L’éditeur conserve explicitement méthode, origine et date ; on peut enregistrer une cible personnelle, choisir « Sans cible » ou revenir aux repères proposés. Un retour choisi n’est pas une activation automatique. Un import personnel prime sur un repère automatique, même si sa date est plus ancienne ; une modification personnelle locale prime sur un conflit du même jour. Les activations automatiques réimportées conservent la plus ancienne date applicable, sans ajout en double. Le marqueur, les méthodes, origines et dates sont validés, exportés et importés dans le document existant. Pas de second système de cibles.

### Vérifications automatisées et recette iPhone

Les nouveaux tests sont `tests/reliability.cjs`, `tests/volume-references.cjs` et `tests/volume-mobile.cjs`, inclus dans `npm test`. Ils provoquent une vraie transaction IndexedDB bloquée et un abandon de transaction, recréent le bouton pendant l’écriture, puis vérifient le nombre de séries et le curseur. Ils couvrent aussi reprise d’un ancien brouillon complet, correction de la série précédente après avancement, nouvelle tentative, panneaux, reprise hors connexion, D8/S6/V11, méthodes distinctes, migrations/imports, filtrage, priorités à zéro, exclusions temporelles, texte agrandi et absence de débordement à 320/390 px. Le test du clavier simule **un visualViewport plus petit avec fenêtre inchangée**, en plus des scénarios existants de fenêtre réduite. Cela ne constitue pas une validation du clavier iOS, de VoiceOver ou du mode installé sur appareil réel.

À vérifier sur un iPhone physique, hors séance réelle, avec un modèle de test et une sauvegarde JSON préalable :

1. Dans Safari, puis depuis l’icône installée sur l’écran d’accueil, lancer un modèle comprenant exercice puis triset. Ouvrir le clavier de charge et de répétitions : valeurs et validation doivent rester visibles, sans navigation superposée ni bouton sous la zone de sécurité. Tester portrait/paysage, retour d’arrière-plan et texte agrandi.
2. Faire un double appui rapide sur Valider : une seule série et une seule étape. Utiliser « Modifier » après l’avancement, corriger l’ancienne série, puis vérifier le retour au même exercice courant et la conservation de son brouillon. Le clavier ne doit pas s’ouvrir à l’ouverture du dialogue ; après saisie il ne doit masquer ni répétitions ni Enregistrer.
3. Replier/déplier les séries et les tours, corriger/supprimer/annuler une série. Vérifier ouverture, défilement et focus. Avec VoiceOver, parcourir la carte active puis les autres cartes : l’ordre annoncé doit correspondre à l’ordre visible.
4. Dans Volume, lire les quatre colonnes sans balayage horizontal, ouvrir un détail, essayer « Tous les muscles » et inspecter les noms longs. Vérifier la carte « Cette semaine » sur l’accueil.
5. En mode avion après un premier chargement, fermer puis rouvrir l’application : même exercice, même étape et brouillon. Abandonner la séance de test, vérifier la disparition de sa contribution et la conservation des séances passées.

Restent non vérifiés automatiquement : clavier Safari natif, zoom de texte natif iOS, VoiceOver réel, zones de sécurité matérielles, gestes et cycle de vie du mode installé. Les tests Chromium isolés n’accèdent jamais aux données personnelles de l’application publiée.

## Création manuelle des séances

Entraînement ouvre directement les séances enregistrées, avec un résumé **séries · durée estimée · principaux muscles**, son détail Directes / Secondaires et Commencer. Modifier, Dupliquer, Supprimer et Créer une séance sont regroupés dans **Mes modèles**. La suppression retire uniquement le modèle enregistré, après confirmation ; elle conserve l’historique, une éventuelle séance active et les anciens plannings. Une séance active conserve son action explicite Reprendre. Les quatre onglets restent Entraînement, Historique, Progression et Corps. Ma semaine et le parcours de génération ne sont plus proposés. L’accueil est limité aux séances enregistrées et à leur création ; le suivi hebdomadaire reste dans Progression → Volume.

La création utilise un brouillon indépendant : rechercher un exercice du catalogue personnel ou des alternatives structurées, ajuster séries, plage de répétitions et repos, ordonner les blocs et créer des groupes avec l’éditeur existant. Donner un nom puis Enregistrer ajoute la séance à l’accueil. Une duplication ouvre une copie à modifier, sans changer la source. Un échec d’écriture garde le brouillon et permet de réessayer ; l’enregistrement est verrouillé contre les doubles appuis.

Le bandeau supérieur de l’éditeur affiche le nombre de séries de travail, la durée estimée et trois muscles principaux. Un appui ouvre les colonnes Directes / Secondaires. Il s’actualise après ajout, retrait, réglage, réordonnancement ou modification de groupe. La durée réutilise la chronologie de `programming.js` : repos personnels, échauffement, préparations, installations, transitions et marge, sans repos fictif après la dernière série. Les tours incomplets, par exemple A–B–A–B–A, conservent les quantités indépendantes et le temps de récupération de chaque membre.

Le retrait du planning est **uniquement un retrait d’interface** : `weekPlans`, les préférences et les anciens liens de séances restent stockés et inclus dans les exports/imports JSON. Les lancements directs n’ajoutent plus d’occurrence au planning archivé. Les modules de planification et les documents [conception](docs/PROGRAMMING.md) / [anciens exemples](docs/PROGRAMMING-EXAMPLES.md) sont conservés pour compatibilité ; aucun générateur n’est accessible dans le parcours courant. Le calcul de durée reste utilisé par l’éditeur manuel.

`npm test` comprend `tests/manual-session-ui.cjs` : parcours 390 px créer → rechercher/ajouter → régler les séries, répétitions et repos → réordonner/grouper → nommer → enregistrer → lancer. Le test couvre également les séances antérieures, la duplication indépendante, le planning conservé, l’export et le catalogue hors connexion. Les tests des groupes asymétriques, de la fiabilité d’écriture, des volumes et des autres onglets restent exécutés.

Sur iPhone physique, vérifier dans Safari puis en mode installé : recherche avec clavier ouvert, accès aux champs et à Enregistrer, ouverture/fermeture du bandeau par muscle et reprise hors connexion. La simulation Chromium à 390 px ne valide pas le clavier natif iOS, VoiceOver ou les zones de sécurité matérielles.

### Repos automatique en séance

Le sélecteur « Repos après cette série », avant Valider, permet de choisir une durée ou Sans repos. Le choix reste propre à la séance et au contexte de l’exercice (entre exercices, fin de tour, fin de groupe) ; le modèle reste inchangé. Les valeurs initiales respectent l’enchaînement : un superset peut proposer zéro entre membres, son repos de fin de tour et le repos individuel pour deux passages consécutifs du même exercice. Aucun repos final fictif n’est ajouté au groupe, sauf choix explicite.

Après confirmation IndexedDB d’une nouvelle série, le chrono apparaît au centre en grand. Réduire garde le compte à rebours dans l’en-tête ; Terminer le repos l’arrête. Une correction ne le redémarre pas. L’échéance et le choix sont conservés dans les sauvegardes ; revenir dans la séance reprend le temps restant. À expiration, retour à la saisie sans ouverture automatique du clavier. Le sélecteur se masque lorsque le clavier réduit l’espace de saisie, pour garder charge, répétitions et validation accessibles.

`tests/rest.cjs` vérifie les repos d’un groupe 3/2 et les choix par contexte. `tests/rest-home.cjs` teste le nouvel accueil et le chrono à 390 px : écriture ralentie, double validation, échec/retry, réduction, arrêt, reprise et expiration. Les anciens parcours réduisent le nouveau chrono comme le ferait l’utilisateur avant de poursuivre leurs assertions. La simulation de visualViewport reste distincte d’une validation du clavier sur iPhone physique.

L’accueil présente les cartes sur deux colonnes, avec les informations actuelles conservées. Ouvrir le détail musculaire élargit la carte sur la rangée pour garder Directes / Secondaires lisibles. Le petit bilan inférieur compte les séances terminées non vides, celles d’aujourd’hui et des six jours précédents, puis leurs séries de travail validées. Les échauffements, séries prévues, séances actives et dates futures sont exclus du compteur de séries ; une dégressive reste une seule série.

## Comptes, profils et Classement

L’avatar ouvre Mon profil et ses paramètres. La barre conserve Entraînement, Historique, Progression et Corps, avec Classement après Progression. Le SDK officiel gère inscription, connexion, session persistante, récupération du mot de passe et déconnexion. Les données locales/synchronisées sont séparées par compte ; les seules performances sportives validées deviennent publiques après confirmation serveur.

Le code, les trois migrations, la séparation public/privé, les règles d’accès, les calculs des deux records, les tests réels locaux et la recette iPhone sont décrits dans [docs/ACCOUNTS.md](docs/ACCOUNTS.md).

**Activation de production encore nécessaire :** aucun service hébergé n’était disponible. Créer un projet Supabase, appliquer les migrations et les URL de retour, configurer l’e-mail transactionnel, puis fournir uniquement l’URL et la clé publique. `cloud-config.js` reste vide ; l’application locale fonctionne et les pages de comptes/classement expliquent cette attente. Aucune clé d’administration ne doit être placée dans le dépôt ou le navigateur.

## Communauté, objectifs et badges

Voir [l’intégration et son statut réel](docs/COMMUNITY-SETUP.md) pour les migrations 005–007, les tests et les captures.

# Progression — Volume compact

La maquette jointe est la référence de structure. Les chiffres restent ceux du document personnel ; aucune valeur illustrative n’est copiée.

## Présentation

- En-tête commun resserré de Progression conservé. Les trois onglets Performances / Volume / Exercices et muscles ont les mêmes dimensions et utilisent les pictogrammes existants.
- Périodes sur une seule ligne : Semaine, 4 semaines, 12 semaines, Année ; choix natif d’une date et flèches de navigation. Le retour à la semaine actuelle n’apparaît que lorsqu’on quitte la période courante.
- Quatre statistiques horizontales séparées : séances, séries de travail, durée enregistrée et évolution sur une période précédente équivalente. Durées inconnues et comparaisons impossibles : tiret.
- Six lignes initiales : Pectoraux, Grand dorsal, Haut du dos, Épaules (total), Bras et Jambes. Pictogramme, libellé, barre, quantité/objectif et pourcentage arrondi. Plus de sous-titres directs/secondaires permanents dans le tableau.
- Voir tous les muscles développe les compartiments individuels et les autres muscles du moteur hebdomadaire. Les trois regroupements restent des lignes de synthèse ; leurs subdivisions portent leurs noms anatomiques. Les replis existants du brachial et des abducteurs restent ceux du moteur.
- Sélecteur Séries / Tonnage. Aucun objectif en séries n’est affiché en mode kg.
- Détail immédiatement sous le tableau, ouvert dès l’arrivée sur Pectoraux. Toucher une ligne actualise la carte sans changer de page ni déclencher de défilement. Jauge, quantités directes/secondaires et exercices contributeurs, avec date, séance, quantité pondérée et ouverture du bilan.
- Voir l’historique ouvre huit semaines pour le muscle ou le regroupement effectivement sélectionné. Une ligne permet de revenir à sa semaine.
- Objectifs et méthodes dans une rubrique repliable sous le détail. L’éditeur d’objectifs existant est réutilisé ; chaque objectif individuel reste modifiable.
- L’analyse hebdomadaire avancée existante reste accessible dans un repli séparé : liste détaillée et filtre, épingles, objectifs datés et méthodes, historique, observations, semaines particulières, contributions et volumes provisoires de la séance active. Les données en cours restent exclues des totaux terminés.

## Calculs et cohérence

Le module de présentation réutilise `weeklyMuscleVolume`, `targetForWeek`, `targetMethod`, `targetValue`, `volumeEstimate`, `activitySummary` et `normalizedTonnage`. Les fichiers des moteurs, les formats de données et la logique de synchronisation ne changent pas.

### Séries et objectifs

La pondération reste directes + 0,5 × secondaires : 4 directes et 2 secondaires donnent 5 séries comptabilisées, soit 42 % d’un objectif de 12.

Les regroupements Épaules, Bras et Jambes additionnent les compartiments musculaires existants, leurs contributions et leurs objectifs compatibles. Ce sont des sommes de volumes musculaires ; une série touchant deux compartiments peut contribuer aux deux. Ces lignes ne s’additionnent pas au total des séries de travail. Cette convention est précisée dans l’aide repliée ; aucun nouveau moteur anatomique ou objectif global n’est introduit.

Les objectifs fractionnels continuent d’utiliser la pondération. Un ancien objectif personnel en séries directes conserve son compteur direct, son pourcentage et sa méthode ; le suffixe « d. » et le détail l’indiquent. Aucune conversion silencieuse de la cible. Méthodes mélangées ou objectif absent sur une partie de la période : pas de pourcentage de groupe inventé ; les objectifs individuels restent accessibles.

Pour 4 ou 12 semaines, les objectifs sont additionnés à leurs dates applicables, avec la méthode d’origine. Pour l’année civile, les semaines de bord sont proratisées selon les jours inclus. Le pourcentage reste indisponible si la couverture des objectifs est incomplète.

### Comparaisons de périodes

Semaine : lundi à dimanche. 4 et 12 semaines : 28 et 84 jours se terminant le dimanche de la semaine choisie. Année : année civile, y compris le 29 février.

L’évolution compare deux fenêtres de durée calendaire identique. Pour une période en cours, la fenêtre précédente contient le même nombre de jours écoulés. Base précédente nulle, période future ou données non comparables : tiret. La mesure est le nombre de séries de travail en mode Séries, ou le tonnage normalisé complet en mode Tonnage. Une hausse du volume n’est pas présentée comme un gain de performance ou de masse musculaire.

### Tonnage

Utiliser les kg normalisés du helper existant : unités, convention et côtés connus, échauffements exclus, étapes dégressives incluses. Contributions directes à 1, secondaires à 0,5. Les regroupements additionnent les compartiments selon la même convention que les séries.

Aucun objectif en séries, ni pourcentage d’atteinte associé. Les barres sont relatives à la valeur musculaire maximale de la période et la jauge est neutre. Métadonnées ambiguës : quantité inconnue en tiret, ou quantité connue partielle précédée de « ≥ » ; aucune fausse valeur zéro ou comparaison de tonnage partiellement connu. Les analyses avancées existantes de tonnage demeurent accessibles dans Performances.

## Validation visuelle

[Captures réelles](verification-volume-compact/) avec un document de test local, sous Chromium et WebKit mobile tactile, à 320/390/430 px. La capture de 390 px a été examinée et comparée à la maquette ; les lignes, le bouton Voir tous, la jauge et les contributions ont ensuite été resserrés.

À 390 × 844 px, dans le scénario de contrôle : sélection de période de 32 px, tableau initial de 229 px, début du détail vers 525 px et carte entière avec trois contributeurs avant la navigation du bas. Les six lignes ont des cibles de 30 px ; les contributions font au moins 32 px. Ces compromis de densité conservent des cibles tactiles séparées et des intitulés accessibles.

Vérification des zones sûres simulées : 44 px en haut et 34 px supplémentaires en bas ; le contenu reste accessible en défilant au-dessus de la navigation. Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ici ; WebKit Linux ne constitue pas ces tests matériels.

## Fichiers

`volume-dashboard.js` et `volume-dashboard.css` portent les composants et indicateurs de présentation. `app.js` compose la page et ses actions, et conserve l’analyse hebdomadaire existante. `index.html` charge les styles ; `sw.js` et le workflow Pages incluent les deux fichiers dans la publication et le cache. Tests dédiés : `tests/volume-dashboard.cjs` et `tests/volume-dashboard-ui.cjs` ; parcours existants adaptés à l’accès à l’analyse avancée et à la nouvelle navigation.

Aucune migration, réinitialisation, modification de données source, de SVG, de compte ou de synchronisation.

## Résultat des tests

- `npm test` : les 78 scripts passent, notamment calculs de volume et d’identité, objectifs datés/directs/pondérés, semaines particulières, entraînement/groupes, historique, sauvegardes, véritable cache hors connexion, comptes et isolation, éditeur et vues sociales.
- Tests dédiés sous Chromium et WebKit mobile tactile : 320/390/430 px, les quatre périodes sans débordement, six lignes, sélection directe, trois contributions et carte avant la navigation à 390/430 px, Séries/Tonnage, tous les muscles, historique de la sélection, objectifs, accès au bilan et retour. Comparaison intégrale du document avant/après : aucune mutation de consultation.
- Tests unitaires : 4 + 0,5 × 2 = 5 et 42 %, objectifs historiques et méthodes mélangées, 7/28/84 jours et année bissextile, durée identique de comparaison, période future et base nulle, kg connus/partiels/inconnus et absence de mutation.
- Les échanges cloud et l’isolation sont vérifiés par les parcours simulés existants. Aucune donnée de production n’est modifiée pour les tests et aucune synchronisation forcée d’un compte réel n’est provoquée.

Élan — Cahier des charges complet : badges V2, XP,
rangs et saisons
Version corrigée — 9 novembre 2026. À transmettre intégralement à Codex. Branche de départ :
`chore/isolated-v1-test`. Ne jamais supposer qu'une conversation Codex connaît des décisions prises dans ChatGPT.



Mission et contraintes
Terminer en une seule tâche autonome le système V2 des badges, XP, rangs permanents, classements mensuels et
interfaces. Le dépôt contient déjà `badges-v2/catalog.js`, `volume.js`, `index.js` : 150 identifiants réservés, dont 48
Volume calculables, tests unitaires et intégration PostgreSQL locale réussis. Réutiliser ce travail, ne pas
recommencer. Vérifier l'état Git, créer une branche de livraison dédiée depuis la branche de travail si nécessaire,
committer régulièrement. Ne pas modifier, supprimer ou migrer les données du Supabase hébergé ; pas de
déploiement GitHub Pages, pas de fusion `main`, pas d'activation V2 en production sans autorisation explicite.
Conserver V1 opérationnelle et prévoir bascule réversible par feature flag. Tests uniquement en environnement local
isolé. Préserver historique, modèles, exercices, records, conventions de charge, RLS et données utilisateurs. Ne pas
masquer les échecs de tests.



Catalogue — 150 badges
Chaque badge possède un ID stable, nom, description, catégorie, palier, rareté, récompense XP, critère calculable,
progression et date d'obtention si connue. Les 48 noms Volume ci-dessous ont été retrouvés dans nos échanges et
doivent être repris à l’identique. Les noms individuels Performance ne sont pas certifiables depuis le contexte
récupéré : rechercher d’abord dans les sources du dépôt et documents existants ; à défaut, produire des
propositions distinctement identifiées comme nouvelles, sans les présenter comme nos choix historiques. Ne jamais
inventer un ancien accord. Éviter tout doublon et ne pas renommer les identifiants déjà réservés.



A. Volume musculaire : 48 badges
8 muscles × 6 seuils cumulés de séries de travail directes validées : 25, 100, 250, 500, 1 000, 2 500.

Muscles : pectoraux, grand dorsal, épaules, biceps, triceps, quadriceps, fessiers, mollets.

Ne pas compter séries d'échauffement, séries secondaires, séries supprimées ou non validées. Plusieurs séances le
même jour comptent distinctement. Utiliser les mappings de muscles existants et leur version historique ; les
exercices inconnus ne doivent pas être affectés arbitrairement. Progression vers prochain palier ; calcul rétroactif
sur l'historique disponible. Réutiliser les 48 badges déjà fonctionnels et leurs tests.

Noms exacts validés des 48 badges Volume, paliers 1 à 6 :

| Muscle | Palier 1 | Palier 2 | Palier 3 | Palier 4 | Palier 5 | Palier 6 |

|---|---|---|---|---|---|---|

| Pectoraux | Première couche | Gorille junior | Armure intégrée | Dos argenté | King Kong | Gorille blindé |

| Grand dorsal | Premières plumes | Grand angle | Chauve-souris | Wingsuit | Hors gabarit | Espace aérien réglementé |

| Épaules | Premiers pixels | Noix de coco | Écran large | Épaules en 4K | Format IMAX | Format Hulk |

| Biceps | Petit bras | Épinards | Popeye | Coutures sous tension | Taille sur mesure | Interdit aux manches |

| Triceps | Bras articulé | Assistance hydraulique | Vérin renforcé | Service technique | Pression maximale | Garantie constructeur annulée |

| Quadriceps | Cuisses de poulet | Pilons renforcés | Vélociraptor | T-Rex | Extinction évitée | Jurassic Gym |

| Fessiers | Mise en forme | BBL naturel | Airbag intégré | Pare-chocs renforcé | Crash-test validé | Zone de collision |

| Mollets | Sur la pointe | Ressorts intégrés | Escaliers facultatifs | Le montagnard | Sommet en vue | Au-dessus des nuages |
Associer les noms aux seuils dans cet ordre : 25 / 100 / 250 / 500 / 1 000 / 2 500 séries directes. Les thèmes et
l'humour font partie de l'identité du produit : ne pas remplacer par des noms génériques.



B. Performance : 48 badges
8 familles × 6 seuils de charge en kg, atteints sur au moins une série de travail validée de 3 répétitions ou plus :

| Famille | Seuils kg (paliers 1 à 6) |

|---|---|

| Développés pectoraux | 40, 50, 60, 80, 110, 130 |

| Développé épaules | 20, 40, 60, 70, 80, 90 |

| Tirage vertical | 40, 50, 60, 80, 100, 120 |

| Tirage horizontal | 40, 50, 60, 70, 80, 100 |

| Squat / presse | 30, 50, 70, 100, 120, 150 |

| Hip thrust / glute bridge | 60, 90, 110, 150, 180, 200 |

| Curl biceps | 20, 28, 32, 36, 40, 45 |

| Extension triceps | 10, 15, 20, 30, 40, 50 |


Associer les exercices à une famille à partir d'identifiants/variantes explicites, jamais par recherche approximative
dans un libellé. Bilatéral : charge saisie = totale ; unilatéral : charge saisie = par côté. Les records et badges de
charge utilisent la charge saisie, sans la multiplier par deux ; seul le tonnage unilatéral est doublé. Si la structure
existante présente des conventions contradictoires ou une absence d'information historique, conserver la valeur
brute et signaler les cas non comparables. Ne pas convertir silencieusement les poids des machines. Tests de seuil
exact, 2/3 répétitions, variantes, unilatéral, historique, cas inconnus.



C. Tonnage : 12 badges
Tonnage cumulé sur toutes les séances valides, en tonnes métriques (1 t = 1 000 kg), selon les conventions Élan :
charge × répétitions ; unilatéral × 2. Ne pas multiplier les records de charge. Les seuils et noms, dans l'ordre :

1. Bagage cabine — 1 t

2. Déménagement prévu — 5 t

3. Utilitaire — 10 t

4. Chariot élévateur — 25 t

5. Tractopelle — 50 t

6. Cent tonnes au compteur — 100 t

7. Fret ferroviaire — 200 t

8. Grue portuaire — 350 t

9. Infrastructure nationale — 500 t

10. Chantier naval — 750 t

11. Millionnaire en kilos — 1 000 t

12. Atlas en RTT — 2 000 t



D. Régularité : 18 badges
Séances validées à vie (8) :

- Bienvenue au club — 1 séance

- Ça devient sérieux — 10
- Habitué des lieux — 25

- Carte de fidélité — 50

- Locataire permanent — 100

- Double des clés — 250

- CDI à la salle — 500

- Dans les murs — 1 000

Semaines calendaires consécutives avec ≥1 séance validée (6) :

- On remet ça — 2 semaines

- Rendez-vous régulier — 4

- Routine installée — 8

- Trimestre validé — 12

- Six mois au compteur — 26

- Abonnement à vie — 52

Utiliser les semaines calendaires ISO en fuseau utilisateur défini, avec traitement explicite des limites d'année et des
fuseaux.

Retour après une absence d'au moins N jours complets sans séance validée (4) :

- De retour — 7 jours

- Reprise du service — 14 jours

- Porté disparu — 30 jours

- Le revenant — 60 jours

Chaque badge de retour est obtenu au plus une fois et rapporte 0 XP. Une reprise après 60 jours peut débloquer
plusieurs seuils, sans répétition ultérieure. Éviter de compter comme « retour » la première séance d'un utilisateur.



E. Secrets : 12 badges
Avant obtention, afficher une vignette masquée « ??? », sans révéler les conditions dans la collection publique. Ne
pas attribuer si l'historique ne permet pas de prouver la condition.

1. Batman — terminer une séance entre 00:00 et 04:59 (heure locale)

2. Le boulanger — terminer une séance entre 05:00 et 05:59

3. Dernier survivant — terminer une séance le 31 décembre

4. Nouvelle année, mêmes problèmes — terminer une séance le 1er janvier

5. Jour de paie — réaliser 3 records personnels sur une même séance

6. C'était la dernière — ajouter et valider une série au-delà du plan initial

7. Encore toi ? — effectuer 10 fois un même modèle de séance

8. Mode avion — terminer une séance hors ligne, puis la synchroniser

9. Le phénix — établir un record sur un exercice après ≥180 jours sans amélioration de ce record

10. Centurion — réaliser 100 répétitions cumulées d'un même exercice pendant une séance

11. Le collectionneur — obtenir 25 badges distincts

12. Ça commence à faire beaucoup — obtenir 100 badges distincts

Pour les conditions non prouvables rétroactivement (par exemple ajout d'une série non planifiée, mode hors ligne),
activer un suivi prospectif robuste ; ne jamais inventer de preuve. Définir une protection contre les dépendances
circulaires pour les badges de collection.
F. Exploits : 12 badges
1. Service express — séance ≤20 min et ≥6 séries validées

2. Le marathonien — séance ≥2 h et ≥10 séries validées

3. Tour du propriétaire — ≥6 muscles distincts travaillés dans une même séance

4. Sans favoritisme — atteindre toutes les cibles musculaires hebdomadaires configurées, avec ≥3 cibles
configurées

5. Semaine parfaite — atteindre tous les objectifs personnels hebdomadaires pendant 4 semaines consécutives

6. Le spécialiste — pratiquer le même exercice dans 100 séances distinctes

7. Polyvalent — pratiquer 50 exercices distincts

8. Record en série — établir 5 records personnels sur des exercices distincts pendant une séance

9. Toujours plus — progresser sur le même exercice lors de 5 séances consécutives le contenant

10. Travail d'équipe — gagner 10 défis coopératifs

11. Rivalité amicale — gagner 10 défis compétitifs

12. Le grand chelem — ≥3 séances par semaine pendant 4 semaines consécutives

Définir « record » et « progression » à partir de la logique existante, avec critères comparables (même exercice,
même convention) et historique chronologique ; éviter que la première performance soit comptée comme une
amélioration par rapport à un record inexistant. Pour les objectifs hebdomadaires, conserver des instantanés des
objectifs applicables à la période, afin que les changements ultérieurs ne réécrivent pas artificiellement le passé. Si
une preuve manque, badge non attribué plutôt que faux positif.



Raretés et récompenses
- Commun : 10 XP

- Peu commun : 25 XP

- Rare : 50 XP

- Épique : 100 XP

- Légendaire : 200 XP

- Mythique : 400 XP

- Exception : les 4 badges de retour après absence valent 0 XP.

La répartition exacte de chaque badge entre les six raretés n'est pas certifiable depuis le contexte récupéré.
Préserver toute correspondance déjà présente dans les sources ; sinon proposer une affectation explicite et
équilibrée, documentée, sans prétendre qu'elle avait été validée. Ne jamais changer les seuils pour ajuster la rareté.



XP permanents et rangs
XP d'activité : +20 par séance terminée comportant ≥3 séries de travail validées ; +1 par série validée ; +1 par
tonne entière soulevée dans la séance, maximum 10 XP de tonnage par séance. Les séances de moins de 3 séries
ne reçoivent pas le bonus de +20, mais les séries effectivement valides restent comptabilisables. Les défis
compétitifs remportés donnent +50 XP ; les coopératifs remportés +25 XP. Les badges donnent une récompense
unique selon leur rareté, sans réattribution lors de recalcul ou de synchronisation.

Rangs permanents : Bronze 0 ; Argent 500 ; Or 1 500 ; Platine 3 000 ; Diamant 5 000 ; Maître 8 000 ; Grand Maître
12 000 ; Légende 18 000 ; Mythique 30 000. Rang = plus haut seuil atteint par XP total. Pas de remise à zéro
saisonnière. Afficher progression vers le rang suivant ; Mythique est le sommet.
Idempotence : un même événement (séance, série, défi, badge) ne peut être récompensé qu'une fois ; gestion des
réessais réseau, doubles clics, synchronisation hors ligne, modifications/suppressions autorisées et corrections
rétroactives. Définir une source de vérité et une politique explicite de recalcul, y compris pour les badges
permanents et les XP déjà octroyés. Transactions, contraintes d'unicité, tests de concurrence et contrôles RLS. Pas
de double comptage lors de migration historique.



Saisons et classement mensuel
Score de saison distinct des XP permanents. Chaque séance du mois contribue selon le même barème d'activité :
+20 si ≥3 séries valides, +1 par série valide, +1 par tonne complète dans la séance (max 10). Défis compétitifs +50
et coopératifs +25 selon leur date d'attribution. Aucun point de saison pour les badges. Aucune limite de séances
par semaine. Toutes les séances éligibles du mois comptent, y compris plusieurs le même jour. Respecter les
frontières mensuelles en fuseau utilisateur, conserver les saisons passées, classement fiable et stable à égalité,
éviter les doublons. Ne pas confondre score saisonnier et rang permanent.



Historique, données et sécurité
Recalcul rétroactif à partir des données réellement disponibles ; marquer les conditions non reconstructibles.
Aucune écriture dans Supabase hébergé avant validation explicite. Créer migrations SQL V2 locales, fonctions/RPC
versionnées, tables dédiées si nécessaires, RLS strictes, scripts de vérification et plan de retour arrière sans perte de
V1. Ne jamais écraser les badges V1, records, modèles ou historique. Séparer les lectures V1/V2 via feature flag
désactivé par défaut ; pas de bascule automatique.



Interface Élan
Respecter design sombre + vert Élan, minimaliste, compact, premium iOS, écran 390 px, Safari/PWA. Écran
collection des 150 badges avec catégories, états obtenus/en cours, progression du prochain palier, rareté, fiche
détaillée, filtres utiles et trois badges favoris configurables. Secrets « ??? » avant obtention ; informations
débloquées ensuite. Sur Profil personnel et profil public : rang permanent, XP, badges favoris et accès à collection
selon règles de visibilité. Sur Compétition : score et classement de saison mensuelle distincts du rang permanent,
saison courante et historiques, ligne utilisateur lisible, amis en priorité si l'interface existante le prévoit. Célébration
groupée des nouveaux badges sans interruptions répétées. Ne pas multiplier menus, cartes et textes techniques.
Préserver toutes les autres fonctionnalités et parcours.



Tableau de chasse — expérience badges
Concevoir une page dédiée Tableau de chasse (ou reprendre la collection existante sous ce nom si cohérent avec la
navigation), pas une simple liste technique. Objectif : donner envie de collectionner et montrer immédiatement les
progrès, sans surcharger l'écran. Identité Élan sombre, accents verts, style premium, cartes compactes. Prévoir :

- En-tête lisible avec nombre de badges débloqués sur 150, progression générale et éventuellement rareté la plus
haute obtenue ; éviter les statistiques redondantes.

- Six catégories clairement accessibles : Volume musculaire, Performance, Tonnage, Régularité, Secrets, Exploits ;
indicateurs `obtenus/total` par catégorie.

- Grille mobile de 3 colonnes, avec badges débloqués mis en valeur, badges verrouillés sobres et état de progression
lorsque calculable ; ne pas révéler les secrets.

- Fiche de badge au toucher : nom, illustration/icône, description, rareté, seuil, progression, date d'obtention si
connue, XP attribués ; état secret masqué avant obtention.

- Trois badges favoris choisis par l'utilisateur, visibles sur son profil et, selon ses paramètres de visibilité, sur son
profil public. Éviter les sélections arbitraires qui écraseraient son choix.

- Navigation simple depuis Profil ; ne pas créer de nouveaux onglets principaux, ni de sous-menus inutiles.
- Prévoir des illustrations distinctives ou des motifs visuels cohérents avec les noms, sans dépendre d'images
externes instables. Les assets finaux pourront être peaufinés après une revue visuelle.



Fin de séance — récapitulatif XP et récompenses
C'est une partie importante de la V2, pas un simple toast. Après validation d'une séance, présenter une expérience
de récompense élégante, rapide et non intrusive :

1. Résumé de séance (durée, séries validées, tonnage, records) dans la logique existante, sans changer les données
de séance.

2. Bloc XP gagnés : décomposition compréhensible des gains d'activité (`+20 séance` si éligible, `+N séries`, `+N
tonnage` plafonné), XP des badges nouvellement débloqués, total de la séance. Ne jamais mélanger XP permanents
et points de saison.

3. Barre de progression du rang avec animation courte de l'XP avant/après ; si un seuil est franchi, mise en valeur du
nouveau rang une seule fois.

4. Badges obtenus pendant la séance : révélation groupée (1 à plusieurs) avec nom, rareté et XP ; permettre de
consulter les détails ou d'aller au Tableau de chasse. Si aucun badge, ne pas afficher une cérémonie vide.

5. Animation légère et soignée (apparition progressive, éclat discret, montée de jauge), sans effets agressifs ni
ralentissement perceptible ; respecter `prefers-reduced-motion`, éviter les animations répétées au rechargement.

6. Bouton clair pour fermer et retourner à l'application. L'utilisateur ne doit jamais être bloqué par une animation.
Les événements sont persistés et idempotents : rouvrir une séance ou resynchroniser hors ligne ne recrée pas les
gains.

7. Sur les séances historiques, afficher les récompenses déjà acquises sans prétendre qu'elles viennent d'être
débloquées aujourd'hui. Pour le backfill, distinguer attribution historique et récompense de la séance en cours.

Direction visuelle : écran mobile iPhone 390 px, hiérarchie forte, grands chiffres XP, peu de texte, un seul accent
vert dominant, rareté visible sans surcharge. L'objectif de cette livraison est un parcours fonctionnel et
esthétiquement cohérent ; une passe de design sera effectuée ensuite avec retours d'usage. Tester les cas zéro, un
et plusieurs badges, passage de rang, synchronisation hors ligne, fermeture et réouverture.



Tests et critères de livraison
Exécuter tests unitaires, intégration PostgreSQL locale, migrations, backfill historique, idempotence, concurrence,
RLS, recalcul, changement de mois/année, fuseaux, hors ligne, seuils exacts, variantes, performances et régressions
V1. Tester navigateur mobile et PWA ; corriger le test de rang précédemment bloqué par un domaine fictif
incompatible avec la CSP locale, sans assouplir la CSP de production. Comparer les métriques V1 avant/après sur les
fixtures. Ne jamais lancer le test SQL destructif hors base jetable explicitement vérifiée. Tester affichage des 150
badges et leurs états, secrets, profil public, XP et saison, Tableau de chasse et animations de fin de séance (avec
mode réduit).

À la fin : commits sauvegardés sur branche dédiée ; liste des composants livrés ; résultats chiffrés des tests et
échecs ; éléments non reconstructibles ou décisions proposées ; vérification qu'aucune écriture distante, fusion ou
publication n'a eu lieu ; jugement explicite « prêt / non prêt pour publication contrôlée ». Travailler de manière
autonome sans demander de validation entre catégories. Ne demander intervention humaine que pour une action
risquée ou une ambiguïté qui empêche réellement la suite.

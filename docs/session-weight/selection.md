# Sélection des comparaisons de tonnage

## Existant et périmètre

L’ancien algorithme filtrait principalement les ratios entre 1 et 100, avec un repli de 0,1 à 200. Il choisissait une catégorie uniformément, puis pondérait les références par 3 pour les ratios de 2 à 30 et par 1 ailleurs. Il évitait la dernière catégorie dès qu’une autre existait et les références utilisées dans les cinq dernières séances si une candidate nouvelle existait. Il n’utilisait aucun score individuel. Le stockage retenait les identifiants uniques par séance, sans chronologie des appuis répétés.

La modification concerne le catalogue local et `session-weight.js`, plus les tests et cette documentation. Le style, le HTML de la carte, le bouton et ses animations sont identiques au début de cette modification. `sessionWeightKg`, les appels de l’application, le calcul du tonnage et les données de séance sont conservés.

## Catalogue et audit

Les 200 entrées sont conservées. Aucune masse, aucun nom, aucune précision, aucun statut de source et aucun statut d’activation n’a changé. Les masses restent indicatives et non vérifiées individuellement. Aucun doublon d’identifiant ou de nom normalisé. Les ordres de grandeur conservés restent plausibles avec les hypothèses d’origine : animaux adultes, véhicules à vide sauf mention contraire, contenances nominales quand elles sont indiquées.

189 références sont actives ; les 11 exclusions déjà présentes restent exclues :

| ID | Référence | Motif conservé |
| --- | --- | --- |
| ref-040 | Méduse lune | Espèce et taille insuffisantes : masse très variable, référence peu parlante. |
| ref-090 | Bibliothèque remplie | Dimensions du meuble et contenu non définis. |
| ref-171 | Bloc de pierre de taille | Dimensions et type de pierre non définis. |
| ref-172 | Gros rocher | Aucun volume défini pour ce rocher. |
| ref-173 | Tronc de chêne | Diamètre, longueur et humidité non définis. |
| ref-176 | Sac de terreau | Volume et humidité du terreau non définis. |
| ref-181 | Statue en bronze grandeur nature | Sculpture pleine ou creuse et dimensions non définies. |
| ref-182 | Petite sculpture en marbre | Dimensions non définies. |
| ref-183 | Cloche d’église moyenne | Aucun modèle ni dimensions de cloche. |
| ref-184 | Grande cloche d’église | Aucun modèle ni dimensions de cloche. |
| ref-196 | Ancre de navire moyen | Navire et modèle d’ancre non définis. |

Chaque référence reçoit des métadonnées explicites :

- `score_interet` de 1 à 5 : familiarité, force de l’image mentale et intérêt ludique ; pas une fonction de la masse. Les voitures, éléphants, hippopotames, rhinocéros et autobus sont très bien notés ; motos, pianos et gros appareils ménagers sont également favorisés.
- `insolite` : sujet décalé ou inhabituel, distinct du score. Une armure peut ainsi être insolite et bien notée.
- `quantite_max` : limite éditoriale par référence, jusqu’à 5 000 pour certains objets quotidiens. Les gros objets et animaux ont des limites plus basses.
- `article_indefini` (`un`/`une`) : accord explicite pour les ratios proches de 1.
- `fractionnable` : vrai uniquement pour les litres et mètres cubes de matériaux, qui peuvent naturellement s’exprimer par fractions.

Répartition des scores parmi les références actives : 1/5 : 1, 2/5 : 25, 3/5 : 93, 4/5 : 54, 5/5 : 16.

## Sélection actuelle

1. Calcul du ratio avec le tonnage déjà fourni au bilan et la masse originale : `quantité = tonnage / masse`. Rejet des données invalides, des quantités au-delà de la limite de la référence et des fractions inférieures à 1 pour les objets, sauf si elles signifient raisonnablement un exemplaire (écart relatif ≤ 10 %). Les volumes explicites peuvent descendre à 0,1 unité.
2. Exclusion de la référence précédente dès qu’une alternative existe, puis des cinq dernières références affichées. Avec un petit catalogue, les plus anciennes sont libérées progressivement. Une seule référence reste utilisable si aucune alternative n’existe. Sans comparaison naturelle, la carte reste masquée.
3. Lorsqu’un sujet insolite et un sujet courant restent disponibles, tirage de la famille insolite avec une probabilité de 15 %, sinon de la famille courante. Si une famille est vide, utilisation de l’autre.
4. Pondération par le score (1 à 5), puis par la lisibilité du ratio : × 1,5 près de 1, × 1,25 jusqu’à 30, × 1 jusqu’à 200, × 0,65 jusqu’à 1 000 et × 0,35 au-delà. Les grands nombres sont moins fréquents, mais restent possibles.
5. Réduction du poids des références récemment vues : division par `1 + 0,5 × occurrences dans les 20 derniers affichages + 0,15 × séances récentes ayant montré la référence`.
6. Tirage d’une catégorie pondérée par la moyenne des poids de ses références, puis d’une référence pondérée dans cette catégorie. La catégorie précédente reçoit un facteur de 0,25. Une grande catégorie ne reçoit donc pas plus de probabilité simplement parce qu’elle contient plus d’entrées.

Le choix reste stable pendant les rendus. La même logique est utilisée à la fin d’une séance et après chaque appui sur « Autre comparaison ». Aucun accès réseau ni table Supabase supplémentaire.

## Formulation et historique

L’arrondi entier est préféré lorsque son erreur relative ne dépasse pas 10 % ; sinon une décimale est conservée. Les séparateurs de milliers sont français. Un quotient voisin de 1 donne par exemple « Environ une citadine » ; la carte conserve son introduction « C’est l’équivalent d’environ ». Les noms singuliers et pluriels restent ceux du catalogue. Le quotient brut reste disponible sans arrondi. Une tolérance numérique minime protège la frontière de 10 % contre les erreurs binaires des nombres JavaScript.

Le stockage conserve la clé existante `elan-session-weight-v1:<compte>` et les cinq dernières entrées de séance. Chaque entrée garde aussi les 20 derniers affichages dans leur ordre exact (`recentReferenceIds`), en plus de l’ensemble des références vues (`referenceIds`). Les anciens documents sont lus sans réinitialisation ; la chronologie précise commence à partir des nouveaux appuis, avec un repli sur la liste existante pour les anciennes entrées. Le stockage est isolé par compte et reste facultatif : la mémoire prend le relais en cas d’indisponibilité.

## Validation

24 000 tirages persistés : pour chacun des six tonnages, 2 000 appuis successifs dans une même séance et 2 000 nouvelles séances. Générateurs déterministes reproductibles, stockage restauré en fin de scénario.

| Tonnage | Ancienne plage 1–100 | Éligibles maintenant | Catégories | Insolites observées | Part maximale d’une référence |
| --- | --- | --- | --- | --- | --- |
| 500 kg | 95 | 135 | 10 | 13.45–13.80 % | 2.95 % |
| 1 300 kg | 94 | 136 | 10 | 14.15–16.10 % | 3.45 % |
| 5 000 kg | 91 | 139 | 10 | 12.70–14.20 % | 3.05 % |
| 15 000 kg | 75 | 125 | 10 | 14.10–15.60 % | 4.40 % |
| 25 000 kg | 70 | 106 | 10 | 13.65–14.20 % | 4.80 % |
| 50 000 kg | 60 | 92 | 9 | 14.55–16.10 % | 4.60 % |

Résultats : aucune répétition immédiate ni parmi les cinq derniers affichages ; au moins 9 catégories par scénario ; 12,7 à 16,1 % d’insolites ; aucune référence au-delà de 4,8 % des tirages ; score moyen supérieur au tirage uniforme dans les 12 scénarios. Toutes les références éligibles, ou toutes sauf une, ont été observées par scénario. Tous les ratios, plafonds, arrondis, accords et mentions approximatives ont été contrôlés.

Un test supplémentaire de 10 000 tirages avec cinq références de même masse, même catégorie et même statut d’insolite vérifie les proportions 1:2:3:4:5 des scores : 660, 1329, 2016, 2632, 3363 occurrences, respectivement. Ce test isole le score des autres critères.

Autres vérifications : ancien stockage, restauration après fermeture, petit pool saturé, une seule référence, absence de référence, invalidité des scores et masses, frontières d’arrondi, mots « un » et « une », nombres avec milliers, tonnage existant, bouton hors connexion, absence de mutation des séances, et rendu Chromium/WebKit sur 320/375/390/430 px avec les noms les plus longs et les plafonds de quantité. Les captures de cette vérification sont écrites hors du projet pour conserver les captures du design déjà validé.

Commandes :

```sh
npm start
ELAN_CAPTURE_DIR=/tmp/elan-selection-captures npm run test:session-weight
ELAN_CAPTURE_DIR=/tmp/elan-selection-captures ELAN_BROWSER=webkit node tests/session-weight-ui.cjs
node tests/saved-session.cjs
node tests/identity.cjs
node tests/free-session-next-ui.cjs
```

[Mesures détaillées des simulations](selection-distribution.json). Les durées sont celles de cet environnement de test, pas une mesure sur iPhone physique.

## Scores et limites par référence

| ID | Référence | Score | Insolite | Quantité maximale | Active |
| --- | --- | --- | --- | --- | --- |
| ref-001 | Éléphant de savane mâle | 5/5 | non | 100 | oui |
| ref-002 | Éléphant d’Asie mâle | 5/5 | non | 100 | oui |
| ref-003 | Hippopotame | 5/5 | non | 100 | oui |
| ref-004 | Rhinocéros blanc | 5/5 | non | 100 | oui |
| ref-005 | Girafe | 4/5 | non | 100 | oui |
| ref-006 | Bison | 4/5 | non | 150 | oui |
| ref-007 | Buffle africain | 4/5 | non | 150 | oui |
| ref-008 | Ours polaire mâle | 5/5 | non | 150 | oui |
| ref-009 | Ours brun | 4/5 | non | 200 | oui |
| ref-010 | Lion mâle | 5/5 | non | 300 | oui |
| ref-011 | Tigre | 5/5 | non | 300 | oui |
| ref-012 | Gorille mâle | 4/5 | non | 300 | oui |
| ref-013 | Zèbre | 4/5 | non | 300 | oui |
| ref-014 | Cheval | 5/5 | non | 300 | oui |
| ref-015 | Vache laitière | 4/5 | non | 300 | oui |
| ref-016 | Cochon domestique | 3/5 | non | 300 | oui |
| ref-017 | Mouton | 3/5 | non | 300 | oui |
| ref-018 | Chèvre | 3/5 | non | 300 | oui |
| ref-019 | Chien labrador | 4/5 | non | 500 | oui |
| ref-020 | Chat domestique | 4/5 | non | 500 | oui |
| ref-021 | Baleine bleue | 5/5 | non | 100 | oui |
| ref-022 | Rorqual commun | 3/5 | non | 100 | oui |
| ref-023 | Cachalot mâle | 4/5 | non | 100 | oui |
| ref-024 | Baleine à bosse | 5/5 | non | 100 | oui |
| ref-025 | Orque | 5/5 | non | 100 | oui |
| ref-026 | Béluga | 3/5 | non | 150 | oui |
| ref-027 | Dauphin commun | 4/5 | non | 300 | oui |
| ref-028 | Grand dauphin | 4/5 | non | 300 | oui |
| ref-029 | Requin blanc | 5/5 | non | 100 | oui |
| ref-030 | Requin-baleine | 4/5 | non | 100 | oui |
| ref-031 | Morse | 3/5 | non | 200 | oui |
| ref-032 | Éléphant de mer mâle | 4/5 | non | 200 | oui |
| ref-033 | Phoque gris | 3/5 | non | 300 | oui |
| ref-034 | Lion de mer | 3/5 | non | 300 | oui |
| ref-035 | Lamantin | 2/5 | oui | 300 | oui |
| ref-036 | Tortue luth | 3/5 | non | 300 | oui |
| ref-037 | Thon rouge | 3/5 | non | 300 | oui |
| ref-038 | Espadon | 3/5 | non | 300 | oui |
| ref-039 | Poulpe géant du Pacifique | 2/5 | oui | 500 | oui |
| ref-040 | Méduse lune | 1/5 | oui | 1000 | non |
| ref-041 | Citadine | 5/5 | non | 100 | oui |
| ref-042 | Berline | 5/5 | non | 100 | oui |
| ref-043 | SUV familial | 4/5 | non | 100 | oui |
| ref-044 | Voiture électrique compacte | 4/5 | non | 100 | oui |
| ref-045 | Moto routière | 4/5 | non | 200 | oui |
| ref-046 | Scooter | 4/5 | non | 200 | oui |
| ref-047 | Vélo de ville | 3/5 | non | 1000 | oui |
| ref-048 | Vélo électrique | 3/5 | non | 800 | oui |
| ref-049 | Trottinette électrique | 3/5 | non | 800 | oui |
| ref-050 | Camionnette | 4/5 | non | 100 | oui |
| ref-051 | Fourgon utilitaire | 4/5 | non | 100 | oui |
| ref-052 | Camion porteur lourd | 4/5 | non | 100 | oui |
| ref-053 | Ensemble semi-remorque chargé à 40 t | 4/5 | non | 100 | oui |
| ref-054 | Bus urbain | 5/5 | non | 100 | oui |
| ref-055 | Autocar | 4/5 | non | 100 | oui |
| ref-056 | Minibus | 4/5 | non | 100 | oui |
| ref-057 | Tracteur agricole | 4/5 | non | 100 | oui |
| ref-058 | Camping-car | 4/5 | non | 100 | oui |
| ref-059 | Quad | 3/5 | non | 300 | oui |
| ref-060 | Kart | 3/5 | non | 300 | oui |
| ref-061 | Avion de ligne moyen-courrier à vide | 5/5 | non | 100 | oui |
| ref-062 | Petit avion de tourisme | 4/5 | non | 100 | oui |
| ref-063 | Hélicoptère léger | 4/5 | non | 100 | oui |
| ref-064 | Hélicoptère de transport | 4/5 | non | 100 | oui |
| ref-065 | Wagon de marchandises à vide | 3/5 | non | 100 | oui |
| ref-066 | Locomotive électrique | 4/5 | non | 100 | oui |
| ref-067 | Rame de tramway | 4/5 | non | 100 | oui |
| ref-068 | Rame de métro | 4/5 | non | 100 | oui |
| ref-069 | Bateau de plaisance | 3/5 | non | 100 | oui |
| ref-070 | Voilier de croisière | 4/5 | non | 100 | oui |
| ref-071 | Jet-ski | 3/5 | non | 100 | oui |
| ref-072 | Kayak | 3/5 | non | 500 | oui |
| ref-073 | Canoë | 3/5 | non | 500 | oui |
| ref-074 | Pédalo | 3/5 | non | 300 | oui |
| ref-075 | Chariot élévateur | 3/5 | non | 100 | oui |
| ref-076 | Mini-pelle | 4/5 | non | 100 | oui |
| ref-077 | Pelle hydraulique | 4/5 | non | 100 | oui |
| ref-078 | Bulldozer | 4/5 | non | 100 | oui |
| ref-079 | Grue mobile | 3/5 | non | 100 | oui |
| ref-080 | Rouleau compresseur | 3/5 | non | 100 | oui |
| ref-081 | Canapé trois places | 4/5 | non | 1000 | oui |
| ref-082 | Fauteuil | 3/5 | non | 500 | oui |
| ref-083 | Lit double avec matelas | 3/5 | non | 500 | oui |
| ref-084 | Matelas double | 3/5 | non | 500 | oui |
| ref-085 | Armoire | 3/5 | non | 500 | oui |
| ref-086 | Commode | 3/5 | non | 500 | oui |
| ref-087 | Table de salle à manger | 3/5 | non | 500 | oui |
| ref-088 | Chaise en bois | 3/5 | non | 1500 | oui |
| ref-089 | Bureau | 3/5 | non | 500 | oui |
| ref-090 | Bibliothèque remplie | 2/5 | oui | 200 | non |
| ref-091 | Réfrigérateur | 4/5 | non | 1000 | oui |
| ref-092 | Congélateur | 3/5 | non | 1000 | oui |
| ref-093 | Machine à laver | 4/5 | non | 1000 | oui |
| ref-094 | Sèche-linge | 3/5 | non | 1000 | oui |
| ref-095 | Lave-vaisselle | 3/5 | non | 1000 | oui |
| ref-096 | Four encastrable | 3/5 | non | 1000 | oui |
| ref-097 | Téléviseur de 55 pouces | 4/5 | non | 1000 | oui |
| ref-098 | Aspirateur traîneau | 3/5 | non | 1000 | oui |
| ref-099 | Micro-ondes | 3/5 | non | 1000 | oui |
| ref-100 | Radiateur en fonte | 3/5 | non | 1000 | oui |
| ref-101 | Smartphone | 3/5 | non | 5000 | oui |
| ref-102 | Ordinateur portable | 3/5 | non | 3000 | oui |
| ref-103 | Tablette | 3/5 | non | 3000 | oui |
| ref-104 | Livre de poche | 3/5 | non | 5000 | oui |
| ref-105 | Gros dictionnaire | 2/5 | oui | 2000 | oui |
| ref-106 | Bouteille d’eau de 1 L pleine | 3/5 | non | 5000 | oui |
| ref-107 | Pack de six bouteilles de 1,5 L | 3/5 | non | 2000 | oui |
| ref-108 | Sac de courses rempli | 3/5 | non | 1000 | oui |
| ref-109 | Valise cabine remplie | 3/5 | non | 1000 | oui |
| ref-110 | Sac à dos scolaire rempli | 3/5 | non | 1000 | oui |
| ref-111 | Paire de chaussures | 3/5 | non | 3000 | oui |
| ref-112 | Ballon de football | 3/5 | non | 3000 | oui |
| ref-113 | Ballon de basket | 3/5 | non | 3000 | oui |
| ref-114 | Casque de vélo | 2/5 | oui | 2000 | oui |
| ref-115 | Parapluie | 2/5 | oui | 2000 | oui |
| ref-116 | Brique de construction | 2/5 | oui | 5000 | oui |
| ref-117 | Parpaing | 2/5 | oui | 3000 | oui |
| ref-118 | Sac de ciment de 25 kg | 3/5 | non | 3000 | oui |
| ref-119 | Haltère de 10 kg | 3/5 | non | 5000 | oui |
| ref-120 | Disque de musculation de 20 kg | 3/5 | non | 3000 | oui |
| ref-121 | Pomme | 3/5 | non | 5000 | oui |
| ref-122 | Banane | 3/5 | non | 5000 | oui |
| ref-123 | Orange | 3/5 | non | 5000 | oui |
| ref-124 | Pastèque | 4/5 | non | 2000 | oui |
| ref-125 | Ananas | 3/5 | non | 2000 | oui |
| ref-126 | Melon | 3/5 | non | 2000 | oui |
| ref-127 | Citrouille | 3/5 | non | 2000 | oui |
| ref-128 | Pomme de terre | 3/5 | non | 5000 | oui |
| ref-129 | Carotte | 2/5 | oui | 5000 | oui |
| ref-130 | Oignon | 2/5 | oui | 5000 | oui |
| ref-131 | Baguette | 3/5 | non | 5000 | oui |
| ref-132 | Pain de campagne | 3/5 | non | 3000 | oui |
| ref-133 | Pizza familiale | 3/5 | non | 2000 | oui |
| ref-134 | Burger | 3/5 | non | 5000 | oui |
| ref-135 | Œuf de poule | 3/5 | non | 5000 | oui |
| ref-136 | Poulet entier | 3/5 | non | 2000 | oui |
| ref-137 | Jambon entier | 2/5 | oui | 1000 | oui |
| ref-138 | Meule de comté | 4/5 | oui | 1000 | oui |
| ref-139 | Sac de riz de 5 kg | 3/5 | non | 2000 | oui |
| ref-140 | Sac de farine de 1 kg | 3/5 | non | 3000 | oui |
| ref-141 | Barre olympique masculine | 3/5 | non | 2000 | oui |
| ref-142 | Kettlebell de 16 kg | 3/5 | non | 2000 | oui |
| ref-143 | Kettlebell de 24 kg | 3/5 | non | 2000 | oui |
| ref-144 | Médecine-ball de 5 kg | 2/5 | oui | 2000 | oui |
| ref-145 | Tapis de course | 4/5 | non | 500 | oui |
| ref-146 | Vélo d’appartement | 3/5 | non | 500 | oui |
| ref-147 | Rameur de fitness | 3/5 | non | 500 | oui |
| ref-148 | Banc de musculation | 3/5 | non | 500 | oui |
| ref-149 | Machine guidée de musculation | 3/5 | non | 300 | oui |
| ref-150 | Table de ping-pong | 4/5 | non | 500 | oui |
| ref-151 | Baby-foot | 4/5 | oui | 500 | oui |
| ref-152 | Billard américain | 4/5 | oui | 300 | oui |
| ref-153 | Piano droit | 4/5 | non | 300 | oui |
| ref-154 | Piano à queue | 4/5 | non | 300 | oui |
| ref-155 | Guitare électrique | 3/5 | non | 1000 | oui |
| ref-156 | Batterie acoustique complète | 3/5 | oui | 500 | oui |
| ref-157 | Kayak de compétition | 2/5 | oui | 1000 | oui |
| ref-158 | Planche de surf | 3/5 | non | 1000 | oui |
| ref-159 | Skateboard | 3/5 | non | 1000 | oui |
| ref-160 | Tente de camping | 3/5 | non | 1000 | oui |
| ref-161 | Litre d’eau | 3/5 | non | 5000 | oui |
| ref-162 | Mètre cube d’eau | 3/5 | non | 100 | oui |
| ref-163 | Mètre cube de sable sec | 2/5 | oui | 100 | oui |
| ref-164 | Mètre cube de gravier | 2/5 | oui | 100 | oui |
| ref-165 | Mètre cube de béton | 2/5 | oui | 100 | oui |
| ref-166 | Mètre cube de granit | 2/5 | oui | 100 | oui |
| ref-167 | Mètre cube de chêne sec | 2/5 | oui | 100 | oui |
| ref-168 | Mètre cube de glace | 2/5 | oui | 100 | oui |
| ref-169 | Mètre cube d’acier | 1/5 | oui | 100 | oui |
| ref-170 | Mètre cube d’aluminium | 2/5 | oui | 100 | oui |
| ref-171 | Bloc de pierre de taille | 1/5 | oui | 100 | non |
| ref-172 | Gros rocher | 1/5 | oui | 100 | non |
| ref-173 | Tronc de chêne | 1/5 | oui | 100 | non |
| ref-174 | Botte de foin ronde | 3/5 | non | 500 | oui |
| ref-175 | Balle de paille rectangulaire | 2/5 | oui | 1000 | oui |
| ref-176 | Sac de terreau | 2/5 | oui | 1000 | non |
| ref-177 | Sac de sel de 25 kg | 2/5 | oui | 1000 | oui |
| ref-178 | Palette de briques | 2/5 | oui | 100 | oui |
| ref-179 | Palette de ciment | 2/5 | oui | 100 | oui |
| ref-180 | Palette de bouteilles d’eau | 2/5 | oui | 100 | oui |
| ref-181 | Statue en bronze grandeur nature | 2/5 | oui | 100 | non |
| ref-182 | Petite sculpture en marbre | 1/5 | oui | 100 | non |
| ref-183 | Cloche d’église moyenne | 2/5 | oui | 100 | non |
| ref-184 | Grande cloche d’église | 2/5 | oui | 100 | non |
| ref-185 | Coffre-fort domestique | 4/5 | non | 300 | oui |
| ref-186 | Coffre-fort professionnel | 4/5 | non | 300 | oui |
| ref-187 | Distributeur automatique | 4/5 | non | 300 | oui |
| ref-188 | Photocopieur professionnel | 3/5 | non | 300 | oui |
| ref-189 | Borne d’arcade | 4/5 | oui | 300 | oui |
| ref-190 | Flipper | 4/5 | oui | 300 | oui |
| ref-191 | Machine à café professionnelle | 3/5 | non | 300 | oui |
| ref-192 | Véritable armure médiévale | 4/5 | oui | 300 | oui |
| ref-193 | Épée médiévale | 3/5 | non | 1000 | oui |
| ref-194 | Boulet de canon ancien | 3/5 | oui | 1000 | oui |
| ref-195 | Ancre de petit bateau | 2/5 | oui | 1000 | oui |
| ref-196 | Ancre de navire moyen | 2/5 | oui | 100 | non |
| ref-197 | Conteneur maritime de 20 pieds à vide | 3/5 | oui | 100 | oui |
| ref-198 | Conteneur maritime de 40 pieds à vide | 3/5 | oui | 100 | oui |
| ref-199 | Cabine téléphonique ancienne | 3/5 | oui | 100 | oui |
| ref-200 | Petite voiture de golf | 3/5 | non | 300 | oui |

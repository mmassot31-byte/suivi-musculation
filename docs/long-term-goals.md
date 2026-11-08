# Mes objectifs : tableau de bord personnel

Les objectifs (`sportGoals`) restent dans le document privé du compte, via `saveLocal` / `sync_snapshot`. Aucun changement de table ni migration Supabase : le RPC enregistre le JSON complet. Le serveur déployé a été vérifié en lecture seule. Aucune séance, preuve, performance ni récompense n'est réécrite.

## Modèle et compatibilité

Les nouveaux objectifs utilisent `version: 4`, un identifiant permanent, un fuseau IANA, `recurring`, une périodicité et une fin facultative. Les objectifs des versions 1, 2 et 3 restent lisibles sans mutation : `goals-legacy.js` conserve leur interprétation et les exports historiques ; `goals-model.js` construit les cartes et périodes. Les anciens cycles conservent leur ancrage historique jusqu'à une modification, les nouveaux cycles sont calendaires.

Une modification ponctuelle garde l'identifiant, les pauses, la date de début et les paramètres/mesures précédents dans `edits`. Une modification récurrente ajoute une phase applicable à la prochaine période (ou au démarrage si l'objectif est futur). Les cibles et calendriers des anciennes périodes restent disponibles. Les changements en attente sont affichés dans le détail. Le suivi continue de se recalculer depuis les séances corrigées, sans verrouiller de faux succès.

## Calculs

- Seules les séances réellement terminées, non actives, avec une date valide sont admissibles. Les identifiants de séance sont dédupliqués ; les échauffements et séries invalidées sont exclus par `recordedSets`.
- Performance : même exercice, identité de charge comparable et au moins les répétitions demandées sur la même série. Charge au moins égale à la cible (assistance : au plus égale). La meilleure série comparable avant le début fournit la référence, et la meilleure série comparable réelle est affichée. La référence historique suit les corrections ; une référence manuelle est facultative et distincte. Le pourcentage mesure l'écart départ–cible seulement quand les références sont comparables ; autrement il est absent. Aucun 1RM ni couple charge/répétitions inventé.
- Régularité : séances terminées distinctes avec au moins une série de travail ou une activité validée.
- Records : événements de `sessionRecap`, dédupliqués par séance/exercice/série/type ; une première observation ne crée pas de record.
- Volume : `weeklyMuscleVolume` et `volumeEstimate`, sans nouvelle pondération.
- Tonnage : `normalizedTonnage`, conventions enregistrées conservées. Une charge inconnue empêche de déclarer la cible atteinte.

## Récurrence

Semaines du lundi au dimanche et mois calendaires, dans le fuseau enregistré avec l'objectif (stable entre appareils). Les journées sont avancées par calendrier, pas en millisecondes de 24 heures, pour les changements d'heure. La première période commence au plus tôt à la création effective ; une période initiale/finale partielle n'est pas un échec. Les anciennes données sans date de création gardent leur début enregistré.

Chaque période possède ses valeurs calculées indépendamment. Une période réussie ne termine jamais l'objectif récurrent. Le taux de respect et la série de réussites concernent seulement les périodes closes, complètes et non suspendues. Une suspension, même partielle, exclut la période du bilan ; les séances pendant la suspension ne sont pas créditées. Les périodes en cours, partielles ou aux charges incomplètes ne réduisent pas le taux. Les pauses modernes ont des instants précis ; les anciennes pauses par jour restent lisibles. Une fin ou un arrêt archive l'objectif et conserve les périodes précédentes. La page réévalue le calendrier à la reprise de l'application et au passage de jour.

## Défis personnels

La section utilise le lecteur et le cache existants de Communauté (`goal_list`, lecture seule) et `personalGoalDisplay`. Les lectures rapprochées sont regroupées ; le cache reste disponible hors ligne. Les cartes ouvrent et déplient le défi dans Compétition. Aucune création de défi ici, aucune fusion des modèles, aucune modification de règle ou récompense. Les défis ne participent pas aux deux compteurs d'objectifs.

## Vérifications

`npm run test:goals` couvre les modèles historiques, les cinq catégories ponctuelles et récurrentes, les limites calendaires/DST, les suspensions et corrections, les modifications en place et les phases, les parcours navigateur, la navigation des défis et la synchronisation avec un deuxième contexte navigateur via un serveur simulé. Les captures du tableau de bord sont générées à 320/375/390/430/800 px. Les tests navigateur utilisent des comptes HTTP simulés : ils n'envoient aucune invitation réelle et ne modifient aucun compte de production. Un moteur WebKit de bureau ne constitue pas un test physique sur iPhone/PWA.

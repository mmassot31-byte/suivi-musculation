# Mes objectifs : progression

Les nouveaux objectifs sont versionnés (`version: 2`) dans `sportGoals`, dans le document privé déjà synchronisé et fusionné par identifiant/date de modification. Aucun changement des tables, RPC, preuves, récompenses ou formulaires des défis. Les objectifs historiques conservent leur période et leurs résultats ; une modification les adapte au nouveau suivi, avec le même identifiant.

- Performance : meilleur poids réalisé à répétitions exactement égales, exercice et identité de charge comparables. Assistance : diminution de charge. Référence : meilleure série comparable de la dernière séance antérieure au début qui en contient une. Pas de pourcentage sans référence ou sans écart exploitable.
- Régularité et volume : semaines de sept jours ancrées sur le début (et non semaines calendaires). La carte montre la valeur de la semaine courante et le nombre de semaines complètes à la cible. Les semaines réussies peuvent être non consécutives. Les objectifs poursuivis restent actifs après le nombre de semaines visé.
- Records : événements de nouveaux records calculés par le moteur existant, depuis le début.
- Tonnage : cumul de toutes les séances terminées sur la période, selon `normalizedTonnage`. Des charges inconnues empêchent la validation et le pourcentage.
- Référence des mesures hebdomadaires : quatre semaines précédentes divisées par quatre, uniquement si un historique existe. Records et tonnage : période précédente de même durée ; sans échéance, référence indisponible (pas de période comparable définie).
- Référence manuelle utilisée seulement si aucune référence historique n'est disponible. Aucune performance n'est inventée.
- Échéance facultative. L'abandon prime sur les résultats ultérieurs. Les corrections des séances recalculent la progression. La référence enregistrée ne change qu'à l'enregistrement des paramètres.

L'aperçu des défis lit le cache de Communauté, sans nouvelle requête ni duplication. L'ouverture recharge les données via le parcours existant de Compétition et déplie le défi choisi.

Validation : tests de calcul `tests/goals-long-term.cjs`, compatibilité `tests/goals.cjs`, parcours mobile `tests/goals-ui.cjs` (création des cinq catégories, édition en place, rechargement, défis, historique préservé, largeurs 320 à 800 px). Les formulaires longs défilent verticalement en conservant les composants existants.

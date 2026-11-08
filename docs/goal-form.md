# Formulaire des objectifs

Le formulaire conserve trois étapes et les cinq catégories. Les nouveaux objectifs
utilisent `version: 3`, les périodes historiques et les objectifs `version: 2`
restent lus sans conversion. `until` limite la dernière période récurrente ; une
absence de limite laisse les périodes se succéder sans supprimer les précédentes.
Une modification archive la configuration précédente à la veille du jour courant
et crée la nouvelle configuration à partir d'aujourd'hui au plus tôt. Les séances
sources ne sont jamais modifiées. La synchronisation utilise le document privé
existant : aucune migration SQL nécessaire.

La performance reste ponctuelle, à répétitions strictement identiques et convention
comparable. La référence initiale est historique, ou facultativement manuelle en
son absence. Les calculs de séries pondérées et de tonnage restent ceux d'Élan.

Validation : `npm run test:goals`, `node tests/goals-long-term.cjs`,
`node tests/identity.cjs`, `node tests/load-normalization.cjs`.
Le test UI vérifie la création des cinq catégories, la persistance après recharge,
la modification avec conservation de la configuration précédente, les dates, les
boutons et les largeurs 320, 375, 390, 393 et 430 px.

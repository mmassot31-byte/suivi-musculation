# Tonnage renseigné pour les badges — migration 013

## Cause et règle corrigée

Les bilans d’historique additionnent les charges saisies × répétitions, dégressives incluses, hors échauffement. Les badges utilisaient le tonnage **normalisé comparable**, qui exige une convention de charge et des côtés connus. Des séries bien enregistrées mais à convention incertaine étaient donc comptées pour les séances/séries, avec zéro tonnage pour les récompenses.

Les badges de tonnage et les repères du profil utilisent désormais le **tonnage renseigné**. Chaque série validée compte avec la charge saisie, sans multiplication implicite par côté ou haltère. Les livres explicitement enregistrées sont converties en kilogrammes ; les anciens enregistrements sans unité reprennent leur convention historique en kilogrammes. Une unité explicite inconnue est exclue et signalée. Les dégressives valides sont incluses. Les échauffements, saisies invalides, séries non validées, compteurs cardio/mobilité, séances actives, abandonnées ou futures sont exclus.

Une séance archivée dans `sessions`, avec des séries réelles, est prise en compte pour ce tonnage même si un ancien format ne conserve pas `endedAt`. Aucune heure de fin ni durée n’est inventée. Cela ne la rend pas éligible aux classements, records, défis ou au fil public. Les autres métriques restent calculées comme avant ; les nouveaux jours apportés par le tonnage historique ont zéro crédit pour les autres métriques.

## Architecture

`social_recorded_tonnage` conserve uniquement les totaux personnels par séance, leur date, le nombre de séries à unité inconnue et l’indicateur d’ancien historique. Elle est protégée par RLS, sans lecture applicative ni RPC de projection publique.

`social_recorded_project` reconstruit ces totaux depuis le document privé courant : dernière version d’une séance et d’une série, déduplication, corrections et suppressions incluses. La projection existante `social_project` appelle cette fonction après son travail habituel. Les faits comparables, leur normalisation, leurs révisions et leurs preuves restent inchangés.

`social_comparable_metrics` conserve la définition antérieure des métriques. `social_metrics` la reprend et remplace uniquement la valeur de tonnage par le nouveau total renseigné. `social_profile` indique `tonnageBasis: "recorded-loads"` ; le client affiche « Tonnage renseigné ». Les seuils et SVG des 68 badges ne changent pas. L’attribution est recalculée par la fonction de badges existante et reste fondée sur les données, sans insertion manuelle de récompenses.

La migration reconstruit seulement les nouveaux totaux et le registre des badges depuis tous les documents existants. Elle ne réécrit aucun document privé, fait sportif comparable, classement, défi, publication ou historique. Les mises à jour futures passent automatiquement par le trigger de synchronisation existant. INSTALL.sql n’est pas rejoué.

## Activation et constat sur @Max

Activation effectuée sur le projet de `cloud-config.js` avec le jeton d’administration configuré, sans affichage de sa valeur. Les trois fonctions remplacées ont été comparées aux versions revues de 005/006 avant activation. Le schéma privé `activation_backup_013_20261106` conserve leurs définitions/droits ainsi que les documents privés, profils, occurrences de badges, favoris et révisions de badges. Il est inaccessible aux rôles applicatifs.

Les empreintes de **13 tables sources** sont comparées dans la transaction. Les occurrences et dates de tous les anciens badges ainsi que les favoris existants doivent rester présents ; sinon la transaction est annulée.

Pour Max, le contrôle réel retrouve :

| Date | Tonnage renseigné |
| --- | ---: |
| 2 novembre 2026, ancien historique | 8 722,5 kg |
| 3 novembre 2026 | 4 392 kg |
| 4 novembre 2026 | 7 322 kg |
| 6 novembre 2026 | 15 355 kg |
| Total | **35 791,5 kg** |

Les 57 séries terminées étaient toutes exclues du tonnage normalisé. Le nouveau total inclut aussi la séance archivée du 2 novembre. Les badges **10 tonnes au total**, **5, 10 et 25 tonnes par semaine** sont recalculés sur ces données.

Pour un retour arrière, restaurer les trois définitions et droits sauvegardés, puis recalculer les badges avec les anciennes métriques à partir des faits actuels. Les copies du registre antérieur permettent un contrôle et une restauration des dates si nécessaire. Garder la nouvelle table privée pour audit. Ne pas restaurer les documents utilisateurs à une version antérieure : ils n’ont pas été modifiés par cette migration.

## Tests

- `tests/recorded-tonnage-db.cjs` : PostgreSQL réel jetable, reproduction zéro → 35 791,5 kg et séance à 15 355 kg, reprise d’archive sans fin inventée, badges total/semaine, dégressives, livres, côtés non doublés, unités inconnues, exclusions, déduplication, synchronisation répétée, correction/suppression, autres métriques inchangées, faits/projections/preuves/défis/documents inchangés et refus des tables/fonctions internes.
- `tests/trophy-room-ui.cjs` : application et SDK avec réponses de test, total affiché à 35,79 t, libellé corrigé, quatre badges attribués et progression vers 50 tonnes à 35 791,5 / 50 000, sans faux badge de 50 tonnes.
- `tests/community-db.cjs` : non-régression SQL des règles de défis, preuves, livres, dégressives, badges et blocages.
- `tests/community-ui.cjs`, `tests/friend-profiles-ui.cjs`, `tests/shell-update.cjs` : profils/collection, amis, mobile et remplacement du cache.
- Vérification Supabase réelle du profil public Max, des quatre totaux par séance, des badges, du refus d’accès à la projection brute et des capacités de compétition.

Aucune performance de test ni invitation n’est créée dans la base réelle. Les contrôles mobiles sont simulés dans Chromium ; Safari iPhone physique n’est pas disponible.

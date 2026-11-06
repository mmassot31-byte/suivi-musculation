# Exercices, côtés et compteurs

Le catalogue manuel contient les nouvelles variantes de squat, presse, charnière de hanche, abduction, arrière d’épaule, rotations et mobilité d’épaule. Ajouts complémentaires : montées sur banc, soulevé de terre roumain à la barre. Les nouvelles machines restent exclues des propositions automatiques tant que leur disponibilité n’est pas confirmée. Le sélecteur manuel affiche tous les exercices ; français et synonymes anglais sont recherchables.

Le choix Bilatéral / Unilatéral est disponible dans le modèle et les options de saisie de chaque exercice de musculation. Unilatéral signifie une série enregistrée par côté réalisé : aucune multiplication cachée. Les séries déjà saisies gardent leur identité de charge immuable. Les records comparent les identités compatibles.

Tapis, vélo, elliptique et rameur proposent un compteur durée (minutes décimales), distance (km) ou calories (kcal), avec une seule valeur à saisir. La mobilité PAILs/RAILs utilise la durée. Les relevés sont modifiables et supprimables en séance et dans l’historique ; ils survivent à la reprise, au hors connexion et à la sauvegarde/restauration.

Stockage additif : `tracking`, `counter`, `activityEntries` et brouillon facultatif `activityDraft`. Les compteurs gardent `sets: []` et `plannedSets: 0`. Aucune répétition ni charge artificielle. Ils ne contribuent pas aux séries, au tonnage, aux records de force ni aux défis de performance musculaire. Les documents privés Supabase conservent déjà leurs champs JSON : aucune migration SQL ni réinitialisation n’est nécessaire. Les projections serveur existantes lisent uniquement les séries de force réelles. Une séance purement cardio n’est donc pas comptée comme séance de musculation pour les badges/défis existants.

Les 17 références musculaires hebdomadaires existantes sont conservées ; abducteurs distincts en anatomie, regroupés avec les fessiers pour la référence hebdomadaire. Aucun ancien document, identifiant d’exercice ou résultat n’est réécrit.

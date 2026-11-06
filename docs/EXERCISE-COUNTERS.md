# Exercices, côtés et compteurs

Le catalogue manuel contient les nouvelles variantes de squat, presse, charnière de hanche, abduction, arrière d’épaule, rotations et mobilité d’épaule. Ajouts complémentaires : montées sur banc, soulevé de terre roumain à la barre. Les nouvelles machines restent exclues des propositions automatiques tant que leur disponibilité n’est pas confirmée. Le sélecteur manuel affiche tous les exercices ; français et synonymes anglais sont recherchables.

Le choix Bilatéral / Unilatéral est disponible dans le modèle et les options de saisie de chaque exercice de musculation. Unilatéral signifie une série enregistrée par côté réalisé : aucune multiplication cachée. Les séries déjà saisies gardent leur identité de charge immuable. Les records comparent les identités compatibles.

Tapis, vélo, elliptique et rameur proposent un compteur durée (minutes décimales), distance (km) ou calories (kcal), avec une seule valeur à saisir. La mobilité PAILs/RAILs utilise la durée. Les relevés sont modifiables et supprimables en séance et dans l’historique ; ils survivent à la reprise, au hors connexion et à la sauvegarde/restauration.

Stockage additif : `tracking`, `counter`, `activityEntries` et brouillon facultatif `activityDraft`. Les compteurs gardent `sets: []` et `plannedSets: 0`. Aucune répétition ni charge artificielle. Ils ne contribuent pas aux séries, au tonnage, aux records de force ni aux défis de performance musculaire. Les documents privés Supabase conservent déjà leurs champs JSON : aucune migration SQL ni réinitialisation n’est nécessaire. Les projections serveur existantes lisent uniquement les séries de force réelles. Une séance purement cardio n’est donc pas comptée comme séance de musculation pour les badges/défis existants.

Les 17 références musculaires hebdomadaires existantes sont conservées ; abducteurs distincts en anatomie, regroupés avec les fessiers pour la référence hebdomadaire. Aucun ancien document, identifiant d’exercice ou résultat n’est réécrit.

## Cardio chronométré

Chaque exercice cardio prévoit une durée (`cardioDuration`, secondes, dix minutes par défaut pour les anciens modèles sans objectif). La durée se règle en minutes lors de la préparation ; elle entre dans l’estimation de la séance. Le chrono démarre uniquement sur appui de Démarrer. Une fenêtre dédiée présente le pictogramme, le temps restant et Pause / Reprendre / Réduire. Un accès compact permet de retrouver un chrono réduit depuis un autre exercice. Un seul chrono cardio peut être actif à la fois.

`cardioTimer` est un état privé de la séance : échéance absolue, temps restant en pause et identité unique d’essai. Le temps continue quand l’écran est réduit ou le navigateur passe en arrière-plan ; la reprise recalcule le temps écoulé. Un navigateur suspendu ou fermé ne peut pas émettre une alerte en arrière-plan : la fin est constatée et enregistrée dès sa reprise. Les pauses ne comptent pas dans la durée réalisée. L’expiration crée automatiquement un seul relevé de durée, identifié par l’essai, sans série de musculation. Un arrêt anticipé enregistre uniquement le temps réalisé après confirmation ; annuler un essai conserve les anciens relevés. La fin de séance demande de terminer ou annuler un chrono encore actif.

Les copies de séances conservent l’objectif, mais effacent le chrono et les relevés. Les états sont sauvegardés hors connexion et dans le document privé Supabase sans migration SQL. Les anciens relevés et compteurs distance/calories restent disponibles sous Relevés et corrections et dans l’historique. La mobilité garde sa saisie existante.

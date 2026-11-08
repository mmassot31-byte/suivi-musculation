# Correction des conventions historiques

La correction est exécutée dans le document du compte connecté à l’ouverture de « Mes exercices ». Elle est enregistrée par la sauvegarde atomique IndexedDB et la synchronisation versionnée existantes. Aucun balayage ou changement des autres comptes ni des définitions publiques.

Preuves acceptées : protocole par série explicite ; convention valide par série ; configuration explicite dans sa référence enregistrée ; identité historique explicite de l’occurrence ; ancienne convention « Total/Charge totale ». Les modes à répétitions ambiguës, unités autres que kg, noms, valeurs numériques, matériel seul et conventions actuelles du catalogue ne permettent pas une inférence. Une incertitude enregistrée par série empêche d’hériter d’une identité de l’exercice.

Les groupes à confirmer sont séparés par référence canonique, matériel, identité enregistrée, protocole, mode, mesure et ancienne convention. Une confirmation affirme explicitement que toutes les séries du groupe ont la même convention. Aucun mode n’est présélectionné. Aucun changement des charges, répétitions, dates, identifiants ou séances.

Chaque lot conserve avant/après dans `loadConventionMigrations`, avec références de séance/exercice/série. La restauration vérifie l’absence de correction plus récente et annule intégralement en cas de conflit ; les nouvelles performances sont conservées. Une nouvelle exécution ne crée pas de journal lorsque rien ne change. Après restauration, les mêmes séries ne sont plus corrigées automatiquement : une nouvelle confirmation reste possible.

Les statistiques sont dérivées du document ; la synchronisation existante reconstruit les projections publiques. Les identités homogènes enregistrées par série permettent désormais aux fiches d’anciennes occurrences de comparer ces performances. Les identités mixtes restent séparées. Le remplacement compte et migre les références portées par les séries, sans toucher aux autres séries d’une occurrence mixte.

Vérification : `npm run test:load-conventions`, tests identity, performance, personal-records, performed-exercises, performance-overview, exercise-library, exercise-library-sync, account-data, et parcours mobiles bibliothèque/profil. Aucun bilan de données réelles ne doit être déduit des fixtures. Le bilan réel apparaît dans le compte connecté.

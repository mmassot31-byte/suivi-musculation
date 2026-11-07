# Audit fonctionnel — 7 novembre 2026

Périmètre : application actuelle après les modifications d’interface. Audit fonctionnel, sans nouvelle refonte. Données et règles métier conservées. Base de départ : `bb5e49f`.

## Bugs reproduits et corrigés

| Cas exécuté avant correction | Résultat observé | Correction et vérification |
| --- | --- | --- |
| Terminer une séance après une validation, en faisant échouer sa transaction IndexedDB | La séance reste sur disque, mais l’état courant ne propose plus Reprendre sans actualisation | Fin de séance atomique ; restauration de l’état complet à l’échec. Reprendre, réessayer et recharger exécutés, avec exactement une séance enregistrée et les séries intactes. |
| Supprimer une séance, en faisant échouer sa transaction IndexedDB | La séance disparaît de la liste courante alors que la suppression n’est pas enregistrée | Même protection atomique, y compris les liens au programme. Historique immédiatement accessible, document sur disque inchangé ; nouvelle suppression puis rechargement vérifiés. |
| Répéter les clics Terminer pendant qu’une écriture est bloquée et cliquer Accueil | Trois confirmations au lieu d’une, traitement répété alors que la séance active est déjà déplacée | Verrou pendant le commit local et restauration de l’interactivité ensuite. Un seul traitement, navigation cohérente, une seule séance et aucun message d’accès à null/undefined. |
| Modifier le profil et simuler une réponse serveur 503 | Le pseudo saisi est remplacé par l’ancien nom lors du réaffichage du formulaire | Conservation du formulaire sur l’erreur, champs réactivés et message technique visible. Pseudo et photo restent sélectionnés ; nouvelle tentative, mise à jour, photo affichée et rechargement exécutés. |

Implémentation localisée : `commitSessionChange` dans `app.js`, conservation du formulaire dans `social-ui.js`, version du cache dans `sw.js`. Le verrou ne dure que le commit IndexedDB local, pas la synchronisation réseau. Les calculs, modèles de données, politiques SQL et fonctions métier n’ont pas été modifiés.

Nouveaux tests : `tests/transaction-actions-ui.cjs` et `tests/profile-actions-ui.cjs`, ajoutés à la suite générale. Les tests des fautes s’exécutent dans des contextes de navigateur isolés avec données locales jetables.

## Parcours réellement exécutés

| Domaine | Interactions exécutées | Nature de la vérification |
| --- | --- | --- |
| Accueil et navigation | Cinq onglets, en-têtes, cartes, menus, modèles facultatifs, création, duplication, suppression et annulation, raccourcis | Application dans Chromium ; parcours mobiles sélectionnés également dans WebKit. Documents de test locaux. |
| Éditeur de séance | Recherche, filtres muscle/matériel, sélection multiple, exercice personnalisé, nom, séries, répétitions, repos, ordre, supersets/tri-sets, groupes asymétriques, dissociation, enregistrer/réouvrir | UI réelle et lecture du document IndexedDB avant/après ; moteurs de groupes et programmation testés séparément. |
| Séance en cours | Commencer, saisie, boutons +/−, validation, correction/annulation, notes et dégressives, navigation, repos automatique/réduction/arrêt, séries ajoutées, reprise après rechargement | UI réelle, transactions et panne IndexedDB injectée ; pas d’écriture d’une performance en production. |
| Cardio et mobilité | Tapis, vélo, elliptique, rameur, compteurs, durée prévue, démarrer/pause/reprise/expiration, un seul relevé après rechargement, secondes de mobilité | UI, horloge contrôlée, véritable cache service worker et passages hors connexion. Les contraintes d’arrière-plan d’iOS ne sont pas reproduites par l’horloge. |
| Récapitulatif et historique | Deux accès au bilan, records dépliables, exercices/séries/notes, fiche et retour, plan, muscles secondaires, comparaison, éditeur, suppression, retour Accueil ; périodes, recherche, calendrier, jours multiples et ouverture d’une séance | UI réelle ; contrôles du document complet, du tonnage et des séries. Dates et performances de fixtures, jamais copiées d’une maquette. |
| Progression | Trois onglets, périodes, graphiques et points, vues exercice/muscle, records, Volume Séries/Tonnage, cibles, muscles supplémentaires, contributeurs et historique | UI réelle et tests des calculs comparables/périodes équivalentes ; aucun pourcentage inventé. |
| Fil, amis, défis et notifications | Recherche dont Gaby, vide/erreur/réessai, demandes et réponses, profils et retour, pagination, réaction et détails du fil, filtres, défis individuels/coopératifs/records, nom, acceptation, refus, annulation, compteurs | Frontend/SDK réels avec réponses HTTP synthétiques ; logique sociale et permissions également exécutées en PostgreSQL isolé. Aucune invitation ni réaction sur un vrai compte. |
| Classements | Saison/exercice, public/amis, autour de soi/pagination, catalogue complet, métriques, filtres, matériel/conventions, références individuelles, zéro/un/plusieurs participants | UI synthétique + SQL réel local ; lectures anonymes réelles du classement publié. Aucune position ou médaille fabriquée. |
| Profil | Raccourcis, Total/semaine, trophées obtenus/en cours, fiches/retour, objectifs, mensurations, édition du profil et photo, erreur/réessai/rechargement | UI réelle ; appels d’écriture de profil/photo interceptés sur un hôte `.invalid`. Les permissions d’un compte réel en production ne sont pas testées par cette simulation. |
| Réglages et données | Préférences couvertes par les parcours, choix du pictogramme, sauvegarde JSON/CSV, restauration/doublons, conservation de l’historique et des modèles, isolation A/B/invité et second appareil simulé | Téléchargements/imports et rechargements réellement exécutés dans les tests ; opérations réseau de comptes synthétiques. |

Les assertions d’erreur JavaScript sont exécutées dans les parcours. Les 503, échecs IndexedDB et états hors connexion provoqués volontairement ne sont pas classés comme erreurs inattendues.

## Supabase et permissions

### Exécuté dans PostgreSQL réel isolé

Sept scripts : `accounts-db`, `competition-db`, `community-db`, `friends-feed-db`, `public-activity-db`, `recorded-tonnage-db`, `season-ranks-db`.

Chaque script crée une base de test jetable sur le PostgreSQL local, applique les migrations et utilise les rôles anon/authenticated et des identités A/B/C. Les écritures et refus d’accès sont exécutés : isolation des documents privés, contrôle de version de synchronisation, idempotence, corrections/suppressions, publication des seules performances admissibles, protection des notes/mensurations, demandes d’amis, défis, preuves, badges/tonnage et scores. Aucune migration n’est appliquée au projet publié.

### Exécuté sur le projet publié, en lecture seule

- `competition_capabilities()` : version 1, completedOnly et challenges actifs ; tonnage explicite.
- `community_capabilities()` : fonctionnalités amis, badges, défis, fil, classements et catalogue activées.
- Appels anonymes à `friend_list`, `social_notifications` et `private_documents` : refus HTTP 401.
- Accès d’administration vérifié par une requête de métadonnées SELECT ; RLS actif sur les tables contrôlées (documents privés, profils, performances, défis et groupes publics). Aucun jeton affiché.
- Navigateur anonyme neuf : cinq onglets, fil, modes de classement, référence individuelle sans rang/médaille, profil public et retour ; 320/390/430 px. Toutes les requêtes d’écriture hors de la liste explicite des RPC de lecture sont interdites dans ce test. Zéro écriture envoyée.

Les tests SQL avec `auth.uid()` contrôlé ne constituent pas une connexion réelle par e-mail ni une validation complète de GoTrue/SMTP en production.

## Maintenance des tests

Des tests complémentaires hors de la suite habituelle attendaient les anciens noms de menus, les anciennes icônes de navigation ou des dimensions désormais différentes. Ils ont été adaptés après vérification : accès aux analyses repliées et aux détails du bilan, sélecteur multiple, icônes vectorielles réellement utilisées, comparaison des libellés au viewBox complet. Cela n’est pas compté comme un bug de l’application ni comme une nouvelle modification graphique.

Les scripts restent reproductibles : `npm test` pour la suite générale ; les sept scripts `*-db.cjs` nécessitent le PostgreSQL local de test sur 127.0.0.1:55432. Ne jamais les rediriger vers le projet Supabase publié.

## Contrôlé par lecture du code seulement

- Dispatch des actions et portée des styles des composants modifiés ; vérification complémentaire aux clics exécutés, sans prétendre couvrir chaque combinaison d’options.
- Garde d’identité du document dans le commit : une restauration après erreur ne remplace pas un autre document devenu actif entre-temps. Le changement distant de compte exactement pendant une panne de commit n’a pas été injecté.
- Les chaînes de connexion/inscription/récupération et les politiques de stockage des avatars ont été examinées ; aucun e-mail réel de confirmation/récupération ni téléversement d’avatar d’un utilisateur réel n’a été déclenché.

## Résultats finaux

- Suite générale `npm test` : **85 scripts, succès (code de sortie 0)**.
- Tests complémentaires : **10 scripts réussis** (pictogrammes, rendu musculaire, parcours étendus, hors connexion et contrats sociaux).
- PostgreSQL isolé : **7 scripts réussis** avec écritures et refus d’accès réels dans les bases jetables.
- **11 parcours rejoués sous WebKit**, dont les deux nouveaux tests de commit et de profil ; succès. Les suites mobiles couvrent 320, 390 et 430 px.
- Lectures publiques réelles et métadonnées de sécurité sur Supabase : succès, aucune écriture en production.
- Aucune autre régression reproduite dans ces parcours. Les limites ci-dessous restent des vérifications à effectuer, pas des tests réussis.

[Résultats structurés et périmètre des tests](AUDIT-FONCTIONNEL-2026-11-07.json). Les lectures de code sont distinguées des exécutions ; les tests sociaux simulés ne sont pas présentés comme des interactions avec de vrais amis.

## Limites et contrôle manuel iPhone

- Safari sur iPhone physique, installation PWA, clavier natif, sélecteur de photo, feuille de partage et zones sûres réelles.
- Mise en veille prolongée, verrouillage et reprise des minuteurs par iOS ; signaux sonores/haptiques et restrictions du système.
- Connexion/confirmation/récupération par e-mail avec des comptes de test réels, puis synchronisation entre deux appareils physiques, notamment lors d’une coupure réseau et d’un conflit.
- Les parcours sociaux frontend utilisent des identités synthétiques, complétés par le SQL réel et les lectures publiques ; pas d’interaction avec de vrais amis pour cet audit.

Aucun audit automatisé ne prouve l’absence de tout bug dans toutes les combinaisons possibles. Les résultats ci-dessus portent sur les interactions et cas explicitement exécutés ; les vérifications manuelles restantes ne sont pas déclarées réussies.

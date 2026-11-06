# Éditeur de séances et premier lancement

## Architecture examinée

`app.js` utilisait le même `editor()` pour les modèles personnels, les brouillons du planificateur et l’adaptation d’une séance active. Les fonctions de groupes (`groups.js`) conservent les identifiants des exercices et de leurs étapes ; l’ordre se déplace par blocs pour préserver les groupes. Les séances de départ provenaient de `initialTemplates` dans `data.js`, recopiées par les deux chemins de création d’un document neuf. Le stockage existant est un document version 1, privé par compte (`account:<id>`) ou propre à l’appareil invité.

## Périmètre de la réalisation

`session-editor.js` rend uniquement l’éditeur des modèles personnels. L’éditeur historique reste utilisé, sans changement de structure, pour l’adaptation en entraînement et les brouillons du planificateur. Les écrans d’entraînement, leurs nombres, repos, compte à rebours cardio, validations et bilans ne sont pas réécrits. Aucun calcul de performance, volume ou record, ni aucune définition musculaire ou pictogramme n’est modifié.

L’écran commence par le nom, le type facultatif et l’ajout d’exercices. Une carte rassemble séries, plage de répétitions et repos. Ses options repliées conservent les commandes de déplacement, la position, les variantes, les réglages de charge, les muscles et le remplacement/retrait. Les commandes principales restent accessibles en bas de l’éditeur. Les groupes apparaissent seulement lorsqu’au moins deux exercices non groupés sont disponibles ; les membres conservent leurs réglages propres. Les groupes fixes acceptent les quantités asymétriques directement, par exemple A-B-A-B-A. Pour les groupes tournants, la modification coordonnée des quantités réutilise la fenêtre de groupe existante plutôt que de deviner une distribution. Les champs supplémentaires des groupes, notamment les verrous de programmation, sont conservés.

Le sélecteur permet une recherche par nom/synonyme/muscle, des filtres musculaires et matériels, une sélection multiple et des exercices personnalisés. Les variantes utilisent les équipements et le contexte des séances, sans identifiant technique. Le catalogue personnel inclut les exercices de l’historique, même lorsque le modèle d’origine a été retiré. Les opérations passent toujours par les identifiants, prescriptions et structures de groupes existants. Aucune dépendance n’est ajoutée.

## Documents neufs et modèles facultatifs

Seuls les documents réellement neufs commencent avec `templates: []`, `sessions: []`, `active: null`. Un document déjà présent n’est jamais vidé, purgé ou remplacé par cette modification. Les modèles facultatifs sont proposés séparément et copiés dans un brouillon ; ils ne deviennent personnels qu’après l’enregistrement explicite. Leurs anciennes charges, notes de réglages privés et séries réalisées ne sont pas préchargées : les références sont vides et les nombres de séries sont des objectifs. Les slogans et les définitions d’exercices restent disponibles.

La reconnaissance d’un ancien document invité strictement identique aux anciens modèles par défaut empêche de les réimporter comme données personnelles dans chaque nouveau compte. Ce document invité reste stocké intact. Toute modification réelle, séance, historique, brouillon ou réglage personnel conserve le mécanisme de rattachement existant et ses archives ; les comptes et clés invitées restent séparés. Une sauvegarde valide avec zéro modèle peut désormais être restaurée. Aucun format de document n’est remplacé et aucune migration SQL n’est nécessaire.

## Vérifications

- Nouvel espace sans données préparées : aucun modèle, aucune performance, deux actions d’accueil.
- Ajout simultané, recherche, filtres, exercice personnalisé, remplacement, métriques directes et validations.
- Déplacement atomique, superset asymétrique, triset, groupe tournant, dissociation, enregistrement/réouverture et conservation des verrous.
- Entraînement réel depuis la séance construite, validation des séries, historique et bilan.
- Modèle facultatif avant/après enregistrement, sans références de performances préchargées ; sauvegarde/restauration d’un espace vide.
- Comptes A/B, stockage invité et second stockage d’appareil avec le vrai gestionnaire de documents et un service contrôlé ; tests SQL PostgreSQL de rôles A/B/visiteur pour l’isolation serveur.
- Nouveau premier lancement hors connexion avec le vrai service worker, bibliothèque, création, rechargement, entraînement et bilan.
- Largeurs 320, 390 et 430 px ; petite hauteur et conservation des saisies pour une approximation du clavier.

Les parcours historiques utilisent explicitement `tests/browser-fixtures.cjs` pour préparer un document d’utilisateur existant. Les tests du premier lancement importent Playwright directement et restent vierges. Cette préparation n’est ni publiée ni utilisée par l’application.

Chromium mobile et le service worker sont testés. Safari sur iPhone physique, le véritable clavier iOS et une installation réelle sur l’écran d’accueil ne sont pas disponibles dans cet environnement ; ces vérifications ne sont pas déclarées réussies.

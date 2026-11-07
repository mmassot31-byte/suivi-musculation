# Historique compact

Refonte limitée à la présentation de l’Historique, d’après la maquette fournie. Aucune modification des données, moteurs de calcul, formats de sauvegarde ou règles de synchronisation.

## Présentation

- En-tête rapproché du logo, titre et sous-titre rapprochés, courte description demandée, recherche dans un carré de 40 px. Avatar et notifications existants conservés.
- Les cinq périodes restent accessibles au-dessus des statistiques : Tout, 7 jours, 30 jours, Ce mois, Cette année. Les trois chiffres réels suivent la période et les filtres. Aucun pourcentage d’évolution ajouté : on conserve les mesures établies, sans comparaison artificielle.
- Bandeau statistique d’environ 45 px, marges horizontales de 10 px, espaces entre sections réduits.
- À 390 et 430 px : grille 60/40, calendrier et résumé côte à côte. Tous les jours du mois restent présents, y compris les six rangées nécessaires à novembre 2026 ; les dates manquantes de l’illustration ne sont pas reproduites.
- Sélection d’une date : mise à jour du résumé de droite, sans masquer les dernières séances de la période. Le filtre « Uniquement cette journée » conserve la possibilité de limiter toute la liste au jour choisi.
- Plusieurs séances dans une journée : compteur, cartes ouvrables et défilement interne du résumé. Journée vide : message discret. Par défaut, sélection du dernier jour entraîné du mois consulté ; à défaut, aujourd’hui ou le premier du mois.
- Dernières séances : lignes horizontales d’environ 58 px, pictogramme conservé, nom, date, durée connue, séries, exercices et chevron. Toute la ligne ouvre le bilan ; accès clavier conservé.
- Recherche, filtres de séance/exercice/intervalle, repli du calendrier, régularité et accès au tonnage restent disponibles. L’historique complet reste consultable avec Tout, sans limite de nombre de séances.
- Une durée absente n’est pas inventée : tiret dans le résumé, omission dans la ligne récente. Le temps total additionne les durées enregistrées avec le helper existant.

## Responsive et validation visuelle

Captures réelles de l’application avec un document de test local : [captures](verification-historique-compact/). La capture à 390 px a été examinée et comparée à la maquette ; les espacements et la hauteur du résumé ont ensuite été réduits.

À 390 × 844 px, même avec une journée à deux séances et un mois de six rangées : calendrier 217 px, résumé 145 px, trois lignes récentes entièrement visibles avant la navigation. Ce résultat reste vérifié avec 44 px réservés en haut et 34 px supplémentaires en bas pour simuler les zones sûres iPhone.

À 320 px, passage à une colonne pour garder les dates lisibles ; à 390 et 430 px, maintien impératif des deux colonnes. Les cellules à 390 px font environ 27 × 30 px, compromis nécessaire à sept dates dans 60 % de la largeur. Un champ de date natif dans la recherche offre un autre moyen de sélection. Les lignes de séance et boutons de résumé ont au moins 48 px de haut.

Tests dédiés sous Chromium et WebKit Linux à 320/390/430 px : absence de débordement, ordre périodes/statistiques, proportions 60/40, trois lignes récentes visibles, mois complet, plusieurs séances et journée vide, navigation des mois, Tout et séances anciennes, filtres, calendrier masquable, ouverture des bilans depuis les deux colonnes, clavier et comparaison intégrale du document avant/après navigation.

Tests unitaires : réutilisation du comptage existant, échauffements exclus, dégressives sans nouvelle série, durée absente ou invalide, sélection de date, caractères échappés et absence de mutation.

Safari sur iPhone physique et le mode installé iOS ne sont pas disponibles ici. Les tests WebKit et zones sûres simulées ne sont pas présentés comme ces tests matériels.

## Fichiers

- `app.js` : composition de l’Historique, portée `history-shell`, présentation du calendrier et actions de consultation.
- `history-view.js` : résumé de journée et lignes récentes, à partir des helpers de statistiques existants.
- `design.css` : remplacement des anciens espacements de l’Historique, règles limitées à cet écran.
- `sw.js` et `.github/workflows/pages.yml` : inclusion du module et mise à jour du cache hors connexion.
- `tests/history-view.cjs`, `tests/history-compact-ui.cjs`, tests de navigation existants et `package.json` : vérifications adaptées à la nouvelle disposition.

## Résultat des vérifications

- `npm test` : les 74 scripts passent, dont entraînement et correction, groupes asymétriques, calendrier et historique, mensurations, calculs de volume/records, sauvegardes et hors connexion, création de séances et isolation des comptes.
- Test dédié également passé sous WebKit Linux avec émulation mobile tactile, aux trois largeurs.
- `tests/evolution-ui.cjs` : navigation calendrier/bilan/fiche d’exercice/progression, conservation de la saisie et du repos, quatre largeurs. Ses attentes historiques ont été adaptées au calendrier visible et au choix explicite de l’onglet Volume, sans changer cet onglet.

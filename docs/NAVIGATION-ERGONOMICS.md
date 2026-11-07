# Navigation et accès aux amis — novembre 2026

## Améliorations retenues après revue

- Le profil regroupe les liens personnels. « Mes amis » y ouvre désormais un écran dédié utilisant la liste existante, les mêmes demandes reçues/envoyées et la même recherche.
- Une notification de demande d’ami mène directement à cet écran. Le raccourci « Mes amis » indique également les demandes en attente, avec un libellé accessible mis à jour sans redessiner la page.
- Consulter le profil d’un ami, ses dernières séances puis revenir restaure la liste des amis dans Profil. Le raccourci du fil et les accès aux défis restent disponibles.
- Ouvrir son profil ne charge plus inutilement les objectifs, les références de records personnels et le fil. Le gestionnaire d’amis récupère seulement ses prérequis et sa liste, pas le fil ni les défis.

## Correction du rendu des onglets

Le rendu précédent associait des masques CSS externes à un fond fixe flouté. Cette combinaison fait intervenir plusieurs couches de composition pendant le défilement sur WebKit. Le symptôme signalé sur l’iPhone n’a pas été reproduit sur un appareil physique dans cet environnement.

Les onglets utilisent désormais les dessins SVG intégrés directement au document et un fond opaque stable. Les formes, proportions, couleurs actives/inactives, dimensions et zones tactiles sont conservées. Les six fichiers SVG fournis restent inchangés ; `scripts/build-navigation.cjs` génère `assets/navigation/artwork.js` depuis ces sources. Un test compare chaque chaîne au SVG source et à son empreinte enregistrée.

Le nouveau module est mis en cache pour le mode hors connexion. Les six chargements séparés devenus inutiles sont retirés du préchargement. Aucun suivi de défilement JavaScript ni recalcul par image n’est ajouté.

## Tests

`pngjs` est une dépendance de développement uniquement, utilisée pour contrôler les pixels réellement peints dans les captures. Aucune dépendance n’est ajoutée à l’application publiée.

- `tests/navigation-scroll-ui.cjs` : création et duplication réelles de séances pour obtenir une page défilante ; vérification des pixels peints de chacun des cinq pictogrammes avant et après défilements haut/bas, changements de hauteur de fenêtre et retour au premier plan, aux largeurs 320, 390 et 430 px ; choix féminin et couleur active conservés.
- Ce parcours a été exécuté avec Chromium et WebKit 26.5. Chromium permet également la simulation de molette ; WebKit mobile est contrôlé par défilement programmatique.
- `tests/friend-profiles-ui.cjs` : entrée depuis Profil, liste de tous les amis, consultation et retour, recherche dans Profil, retour au fil et à son raccourci, vérification des requêtes évitées.
- `tests/notifications-ui.cjs` : compteur sur « Mes amis », notification ouvrant Profil, acceptation/refus et actualisation des comptes, défis conservés et absence de modification des contrôles d’une séance active.
- `npm test` : suite complète de non-régression, dont entraînement, cardio, groupes, statistiques, comptes et mise à jour du cache hors connexion.

Safari sur iPhone physique, le rebond tactile natif et le mode installé iOS restent à confirmer sur appareil. Aucun changement de schéma Supabase et aucune modification des données utilisateurs ne sont nécessaires.

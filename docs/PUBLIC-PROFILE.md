# Profil public compact

Présentation limitée aux données déjà autorisées par les services publics : identité, actions sociales existantes, quatre statistiques, trois séances récentes avec suite dépliable et pagination serveur, performances publiques compactes, trois trophées et progression des paliers acquis. Les conventions et tonnages détaillés restent consultables. Aucun statut de connexion ou donnée privée n’a été ajouté. Une statistique absente est indiquée par un tiret ; les badges hebdomadaires ne sont pas inventés si le serveur ne les fournit pas.

Fichiers : social-ui.js, community-ui.js, friend-feed.js, trophy-room.js, style.css et cache sw.js. Le profil personnel conserve son rendu.

Vérifications exécutées : friend-profiles-ui (320/390/430, détail, encouragement, pagination, amis, vide/erreur/réessai, visite anonyme et changements rapides de profil), public-community-ui, social-preview-ui, profile-compact-ui et trophies-completion. Captures Chromium inspectées et écarts de largeur corrigés. Les tests utilisent des réponses serveur simulées et ne modifient aucun compte réel. Configuration publique, syntaxe et diff vérifiés. Safari sur iPhone physique et le mode installé restent à vérifier.

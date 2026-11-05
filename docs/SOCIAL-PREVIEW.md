# Aperçus iPhone et interface sociale

Référence : `elan-apercus-iphone-codex.zip`, trois maquettes statiques de 390 × 844 px. Les écrans réels reprennent les surfaces, avatars, sélecteurs et cartes du kit, avec les actions et données existantes.

- Dans Classement, la vue Communauté présente Profils / Défis / Classements. Profils permet de chercher un pseudo et de retrouver les participants aux défis du compte ; elle ne crée pas de relation d’amitié.
- Les défis restent des répétitions à charge, variante et convention identiques, calculées par Supabase. Les cartes distinguent invitations, tentatives provisoires et archives. La barre compare les répétitions confirmées par le serveur à `référence + 1`, sans modifier le résultat serveur.
- Mon profil réutilise les compteurs `homeCounts` et l’indication `recordTarget`. Ces repères issus des données privées du compte n’apparaissent pas sur les profils visités. Le prochain repère reste une indication, sans modification du programme.
- Les badges, demandes d’amitié et défis collectifs illustrés ne sont pas simulés : leur spécification fonctionnelle n’est pas fournie dans cette archive. Les statistiques fictives et barres système des maquettes ne sont pas intégrées.
- Aucune migration ni modification Supabase. Les correspondances d’exercices, paramètres, édition de profil et archives restent accessibles.

Le cache v24 recharge les ressources à l’installation et revalide les réponses HTTP pour éviter une ancienne interface conservée dans le cache du navigateur. Il n’impose aucun rechargement pendant une séance.

Vérifications : `npm test`, `npm run test:premium`, `npm run test:evolution`, `npm run test:social-preview`. Les nouvelles interactions sont testées avec des API isolées, sans invitation ni score écrit en production. Les quatre largeurs mobiles sont vérifiées en Chromium ; Safari, le clavier iOS et le mode installé nécessitent un iPhone physique.

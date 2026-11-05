# Recherche d’amis : correction du 5 novembre 2026

Le parcours connecté a été reproduit sur le site publié avec un compte temporaire de test, une vraie session Supabase et les vrais endpoints Auth/PostgREST. Aucune connexion au compte de Gaby et aucune demande d’ami.

Avant correction : saisir « Gaby », puis cliquer Rechercher, déclenche d’abord l’événement change du champ. community.changed ne le traitait pas ; le gestionnaire générique d’app.js appelait render(), remplaçait le champ et le bouton, perdait le texte et empêchait le traitement du clic. Observation réelle : champ vide après clic, uniquement friend_list({}) d’initialisation, HTTP 200 avec liste vide. Aucune requête portant « Gaby ».

La requête SQL n’a pas été modifiée : la comparaison ignore déjà la casse. Après correction locale, toujours avec un compte temporaire authentifié et le serveur Supabase réel : clic Rechercher → friend_list({p_search:"Gaby",p_offset:0}) → HTTP 200 → [{username:"gaby",relation:"none"}] → carte @gaby visible. Un appel direct de contrôle avec la même session confirme la même réponse. Les comptes temporaires ont été supprimés, zéro appel friend_action.

La correction capture la saisie dans le module Communauté et marque input/change comme traités, empêchant le rafraîchissement générique au blur. Le texte reste également conservé lorsqu’un autre rendu a lieu. La recherche dispose d’états distincts (chargement, résultats, aucun résultat, erreur), efface les anciens résultats en cas d’erreur et protège les réponses contre un changement de compte. Aucun profil trouvé n’apparaît qu’après une réponse vide réussie. Une panne affiche une erreur technique, avec code serveur lorsqu’il est disponible, et permet de réessayer.

Test de régression : tests/friend-search.cjs charge l’application entière, avec sa délégation input/change/click et le vrai SDK en session simulée. Il vérifie le payload authentifié, le blur, le résultat Gaby, une réponse vide, une erreur 503 et le nouvel essai. Toutes les réponses HTTP de ce test automatisé sont isolées ; aucun appel d’amitié n’est autorisé. Ce test complète le contrôle connecté avec le vrai serveur, il ne le remplace pas.

Cache incrémenté à elan-shell-v26-friend-search. Aucune migration SQL ni modification de données utilisateurs existantes.

# Recherche des records personnels

Le parcours « Battre mon record » combine les preuves serveur et les séries réellement terminées de l’historique privé. Une référence locale permet de sélectionner un exercice, mais ne suffit jamais à autoriser un défi : la création utilise toujours la preuve renvoyée par Supabase. Les machines restent acceptées pour les défis personnels, avec les mêmes restrictions de classement public.

Un historique dont la charge est « Valeur indiquée (à préciser) » ne possède pas encore de preuve comparable. L’écran permet désormais de sélectionner la série puis de confirmer ce que représente sa charge. La confirmation vise uniquement cette série et est conservée dans `conventionConfirmations`, annulable par les commandes existantes de la fiche exercice. La charge, les répétitions, les notes, les dates et les identifiants restent identiques. L’option « Garder ce réglage pour les prochaines séances » applique les métadonnées aux modèles et plans non démarrés, sans modifier la séance active ni les autres séries passées.

La synchronisation est attendue avant de rafraîchir la preuve. Si elle reste en attente, le défi ne peut pas être lancé et un bouton permet de réessayer. Aucun calcul de tonnage n’est inventé lorsque les côtés restent inconnus. Les conventions confirmées alimentent les identités des futures séries ; les conventions brutes des modèles restent stables pour préserver les références et propositions de charge existantes.

La recherche « Pec », « pectoraux » ou « poitrine » inclut les développés et écartés enregistrés sous un nom anglais. Les résultats paginés ne subissent plus un second filtre qui les rendrait invisibles. Les résultats vides et les erreurs techniques ont des messages distincts.

La bannière globale des états ordinaires « En attente de synchronisation » et « Synchronisé » reste masquée, sans espace dans la page. Le statut reste visible dans Mon profil et les messages critiques (conflit, compte inaccessible) conservent leur affichage. La synchronisation elle-même est inchangée.

Validation : tests unitaires de sélection/confirmation/annulation et conservation des données ; application connectée avec SDK et réponses HTTP contrôlées, du clic de recherche à la preuve sélectionnée ; absence de déplacement dû à la bannière pendant une synchronisation retenue ; SQL PostgreSQL isolé de référence inconnue puis confirmation et création d’un défi personnel. Aucune performance utilisateur n’a été modifiée administrativement et aucune migration SQL supplémentaire n’est nécessaire.

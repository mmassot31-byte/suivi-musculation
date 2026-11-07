# Bibliothèque d’exercices (migrations 017 et 018)

Le catalogue joint est une source technique de candidats. Les règles fonctionnelles de la demande utilisateur priment sur ses consignes. Les dessins et pictogrammes existants ne changent pas.

## Références et conservation

- 247 candidats intégrés ; 32 réutilisent une référence publique existante. Avec 19 variantes anciennes non équivalentes conservées séparément : 266 exercices communs.
- Les noms historiques, alias et anciennes références sont conservés. Les vraies équivalences disposent de liens canoniques ; aucune réécriture massive des historiques ni suppression d’exercice unique.
- Les cas sans variante certaine restent des définitions personnelles liées à leurs métadonnées d’origine. L’erreur confirmée « Shoulder press » renommé en élévation latérale est séparée du développé épaules, classée en deltoïdes latéraux, sans supposer un matériel.
- Une modification d’un commun crée une copie personnelle liée à l’origine ; les modifications suivantes gardent cette copie. Les futures occurrences correspondantes peuvent l’utiliser ; les séries déjà enregistrées gardent leur définition et leur convention. Les groupes utilisent leurs identifiants d’instance, donc plusieurs occurrences identiques restent indépendantes.
- Retirer une fiche personnelle l’archive. Les séances et performances ne sont pas supprimées. Les droits de lecture/écriture sont imposés par les politiques RLS et les RPC, et pas seulement par l’interface.

## Charges et mesures

Les nouvelles séries portent `loadProtocol: elan-2`, le mode et la mesure : bilatéral = charge × répétitions ; unilatéral = charge par côté × répétitions par côté × 2. Les charges de records et classements restent telles que saisies. Les dégressives suivent le même facteur une seule fois.

Les anciennes séries non marquées gardent leurs calculs d’origine. Une convention historique incertaine n’est jamais déduite d’un nouveau préréglage. Les charges additionnelles, le poids du corps, l’assistance et les durées sont distingués. Le poids du corps et l’assistance n’inventent pas de tonnage ; une assistance plus faible constitue une amélioration, pas une charge plus lourde. L’assistance par élastique reste suivie en répétitions, sans inventer des kilogrammes.

Les comparaisons conservent leurs frontières de matériel, d’unité et de mode. Sans machine/modèle connu, une référence reste individuelle ; Smith et élastiques ne deviennent pas comparables artificiellement. Les exercices personnels sont absents du catalogue public et des détails publics projetés.

## Persistance

La bibliothèque personnelle et sa file d’opérations réutilisent le document du compte et son IndexedDB. La saisie n’attend aucun RPC. Les créations sont idempotentes ; une réponse ancienne ne remplace pas une édition plus récente, ni les données d’un autre compte. La synchronisation reprend à la connexion et au retour dans l’application. Les modules de bibliothèque sont inclus dans le cache hors connexion et dans les fichiers publiés.

## Génération et vérification

- `python3 scripts/build-exercise-library.py` : compilation des candidats et des variantes historiques publiques ; mise à jour du bloc de semence de 017.
- `python3 scripts/build-library-projections.py` : adaptations contrôlées des projections existantes, depuis le gabarit versionné. Les assertions empêchent de remplacer silencieusement une fonction qui aurait changé.
- `npm run test:library` : logique, file de synchronisation, PostgreSQL jetable (port local 55432 uniquement), parcours navigateur et captures à 320/390/430 px.
- `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 ELAN_BROWSER=webkit node tests/exercise-library-ui.cjs` : même parcours dans WebKit Linux, sans prétendre valider un iPhone physique.

Avant activation, conserver hors du schéma public une copie récupérable de toutes les tables, des définitions de fonctions et de leurs droits. Vérifier dans la même transaction les empreintes des documents privés, les valeurs/révisions des séries, les preuves de compétition et les objectifs. Ne pas réexécuter INSTALL.sql. Les seuls changements historiques autorisés sont les liens de référence et les projections dérivées ; les valeurs d’origine restent intactes.

Les rapports d’audit détaillés et les sauvegardes administratives contiennent des données privées : ils restent hors du dépôt et hors de GitHub Pages. Une restauration doit d’abord préserver les données créées depuis la sauvegarde ; ne jamais remplacer automatiquement toute la base.

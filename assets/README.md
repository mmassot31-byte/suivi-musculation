# Pictogrammes fournis pour Élan

- `muscles/` : les 15 SVG du ZIP `elan-muscle-icons.zip` et le PNG original du ZIP `elan_pictogramme_haut_du_dos.zip`.
- `workouts/` : les 6 SVG du ZIP `elan-icones-seances-codex.zip`.
- `pictogram-manifest.json` : empreintes SHA-256 des fichiers fournis, conservés sans modification.

Les tracés, transformations et viewBox 256 × 256 sont préservés. Les pictogrammes ont été vectorisés à partir des planches validées ; les petites irrégularités appartiennent aux fichiers sources. Les autres PNG et les planches originales restent dans les archives de référence ; aucune nouvelle illustration n’a été créée.

`npm run build:pictograms` reprend les tracés SVG dans `pictogram-source.js`. `pictograms.js` installe une seule bibliothèque de symboles inline et expose `muscleIcon`, `workoutTypeIcon`, `exercisePrimaryIcon`. Les SVG suivent le token `--accent`, sans fond ajouté. Le symbole Haut du dos référence le PNG local fourni, conservé byte-identique avec ses couleurs et son style. Son viewport retire les marges de présentation autour du dessin et préserve ses proportions dans le même emplacement de 24 px. Le fichier est précaché par le service worker pour le hors connexion.

Les muscles utilisent leurs identifiants internes. Les trois portions des deltoïdes partagent le dessin fourni et portent une indication avant/côté/arrière. Le haut du dos utilise le pictogramme fourni, associé à `upper_back`. Le brachial conserve un repli neutre : son anatomie n’est pas assimilée à un autre muscle. L’icône obliques est disponible sans créer de nouveau compteur métier. La cible hebdomadaire existante des fléchisseurs du coude conserve son calcul ; le pictogramme de biceps est son repère visuel.

Un exercice utilise le premier muscle principal de son profil enregistré, dans l’ordre existant. Un profil vide ou sans dessin disponible conserve le repli générique : aucune association ne provient du titre affiché.

Les types de séances privilégient `workoutType`, puis les métadonnées typées existantes, puis les identifiants stables des modèles d’origine. Le nom libre ne sert jamais à classifier une séance. Les séances personnalisées disposent d’un repli et peuvent choisir leur type visuel dans Mes modèles. Ce réglage ne change ni le nom, ni les exercices, ni les groupes. Aucun ancien document n’est migré.

Les cartes consomment `plannedVolume` et `estimateDuration`, sans nouveau calcul d’attribution : directes et secondaires sont séparées. Le toucher d’un compteur identifie le muscle et affiche les deux valeurs. Une entrée « à classer » représente les séries sans association ; elle ne constitue pas une nouvelle attribution musculaire.

Les SVG biceps et avant-bras séparent leurs contours intérieurs en plusieurs paths : leur rendu brut devient plein, contrairement aux PNG de référence. Le générateur réunit uniquement ces sous-tracés dans un path composé sous la règle evenodd existante pour restaurer les évidements. Aucun point, transformation ni viewBox n’est changé ; les fichiers sources restent byte-identiques. Les tests vérifient séparément les coordonnées de ces deux cas.

# Pictogrammes Élan

Les 12 SVG de `elan_icones_svg_nouveau_lien.zip` remplacent les pictogrammes correspondants, sans retouche des fichiers vectoriels. Les noms avec underscore sont traduits vers les chemins historiques : `grand_dorsal → grand-dorsal`, `haut_du_dos → haut-du-dos`, `ischio_jambiers → ischio-jambiers`, `epaules → deltoides`.

Correspondances internes : `lats` = grand dorsal, `upper_back` = haut du dos, `traps` = trapèzes, `front_delts/side_delts/rear_delts` = épaules, `abductors` = abducteurs (distinct d’`adductors`). Les trois portions d’épaule gardent leurs qualificatifs. Les autres muscles conservent leur SVG complémentaire existant, aucun remplacement n’étant fourni. Aucun PNG musculaire n’est distribué. Les six SVG `workouts/` restent inchangés.

Les dimensions et l’alignement CSS sont conservés. Le générateur reprend les viewBox, les tracés et les couleurs natives des nouveaux SVG, sans fond ajouté. Seul le SVG complémentaire historique `avant-bras.svg` nécessite encore de réunir ses sous-tracés sous evenodd pour conserver les évidements ; son fichier source reste inchangé.

`pictogram-manifest.json` contient les empreintes SHA-256 des 23 fichiers actifs. `npm run build:pictograms` génère les symboles de `pictogram-source.js`, mis en cache hors connexion. Aucun dessin n’est chargé depuis une image matricielle.

Les abducteurs constituent un groupe anatomique distinct dans les fiches et les radars. Leur volume hebdomadaire rejoint la référence existante des fessiers (moyen/petit fessier), sans créer de cible arbitraire ni modifier les objectifs déjà enregistrés.

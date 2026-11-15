# Muscles travaillés — finition fidèle à la référence

## Comparaison visuelle

La fixture `reference` reproduit les 25 séries et les neuf valeurs de la référence : 3,5 / 6 / 3 / 1 / 6 / 3 / 6,5 / 4 / 2,5. Ces valeurs sont calculées par le modèle existant à partir de séries synthétiques avec rôles principaux et secondaires, sans remplacer les résultats du modèle. Le maximum reste 7.

Comparaison des captures mobiles à l'image de référence :

| Élément | Réalisation |
| --- | --- |
| Fond noir / forêt et profondeur | Trois dégradés, ombres intérieures, halos d'angles fixes |
| Bordure arrondie lumineuse | Bordure gris-vert et reflet citron dans les angles opposés |
| Reflets et fines courbes | SVG décoratif intégré, nappes translucides et courbes sans interaction |
| Pictogramme d'en-tête | Torse anatomique pectoraux existant |
| Anatomie au-dessus des intitulés | SVG existants de `pictogram-source.js` et association de `pictograms.js` ; fléchisseurs du coude représentés par le biceps existant |
| Radar lumineux | Halo indépendant, contour citron, points diffusants, remplissage dégradé translucide |
| Grille gris-vert | Anneaux et rayons fins, contraste renforcé |
| Barres | Deux colonnes mobiles, séparateurs, pistes gris-vert, dégradé et lueur à l'extrémité |
| Bandeau inférieur | Information, maximum dynamique, bordure verte, verre sombre et courbe citron |

Le format mobile place le radar au-dessus des barres, puis le bandeau. La taille de l'anatomie varie de 30 à 20 unités selon le nombre d'axes. Le calcul de placement réserve toute la hauteur du pictogramme, du texte et des marges. Les groupes rares à 17 axes demandent davantage de hauteur pour conserver chaque illustration et chaque intitulé. Aucun muscle de remplissage, aucune valeur numérique autour du radar. Pas de bitmap décoratif, animation permanente ou nouvelle dépendance.

## Validation

- `npm run test:session-radar` : réussi (modèle, parcours bilan réel, rendu dynamique, volume visuel).
- Rendu dynamique : 0–17 groupes × 320/375/390/393/414/430 px ; contenu des blocs SVG intégralement contenu, sans chevauchement ; anatomie correspondante au-dessus de chaque texte ; angles réguliers ; position des points et valeurs des barres exactes ; noms longs/sans espaces et valeur zéro.
- Captures artistiques avec les données de la référence à 320/375/390/430 px ; inspection visuelle des exemples 3, 9 et 17 axes.
- `tests/saved-session-ui.cjs` : réussi à 320/390/430 px ; détails et navigation fonctionnels, données locales identiques avant/après consultation, exercices accessibles après défilement. Budget de hauteur mis à jour pour inclure les pictogrammes et le bandeau.
- Tests pictogrammes, migration musculaire, muscles, volume, saved-session, shell-update et contrôle de configuration publique : réussis.
- `npm test` : arrêt sur le défaut déjà connu de `tests/smoke.cjs` (bouton `performance-detail` absent), avant le parcours séance. Cet échec avait déjà été reproduit sur les sources d'origine lors de la correction précédente.
- WebKit : moteur téléchargé, mais exécution empêchée par des bibliothèques Linux manquantes ; aucun résultat Safari/iPhone physique revendiqué. Contrôles mobiles effectués sous Chromium.

Aucun changement dans `radar.js`, `muscles.js`, les associations, séries enregistrées ou pondérations. Cache du service worker renouvelé pour les ressources de présentation.

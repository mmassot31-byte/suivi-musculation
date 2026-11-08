# Fenêtre de groupes — 8 novembre 2026

## Interface

La création et la modification utilisent la même fenêtre compacte : nom, exercices identifiés A–H, pictogrammes existants, quantité unique avec saisie et boutons −/+, retrait, ajout, ordre sous forme de lettres, deux repos et enregistrement. Aucun sélecteur d’organisation ou d’exercice commun n’est affiché.

Les séries alternent automatiquement selon les quantités : A=5, B=3 donne A-B-A-B-A-B-A-A. Un appui maintenu de 230 ms permet de déplacer une lettre de la séquence. Les poignées de la liste permettent également de déplacer les exercices : les lettres sont recalculées selon leur position, les références conservant leurs identifiants. Les flèches du clavier offrent la même fonction sur la poignée sélectionnée. Le bouton ↺ rétablit l’ordre automatique.

Seules les poignées empêchent le défilement tactile. La page reste stable pendant le déplacement. Les séquences longues peuvent défiler à l’approche de leur bord pendant un déplacement ; l’annulation du geste restaure l’ordre précédent.

## Ordre et compatibilité

- `groups.js` reste la source des étapes réellement exécutées. L’aperçu utilise la même séquence que celle transmise au moteur.
- Le mode existant `fixed` accepte désormais 2 à 8 membres. Une propriété optionnelle `order` mémorise les références dans l’ordre choisi. Les groupes automatiques n’en ont pas besoin.
- Les variations de quantités conservent l’ordre relatif des séries restantes. Les nouvelles séries d’un exercice sont insérées après sa dernière occurrence ; un nouveau membre est ajouté à la fin d’un ordre personnalisé. Le bouton de réinitialisation permet de repartir d’une alternance automatique.
- Pour un ordre personnalisé, un nouveau tour commence lorsqu’un exercice réapparaît depuis le dernier début de tour. Le moteur conserve ses règles de repos entre exercices/tours et de repos minimal avant de répéter un même exercice.
- Les anciens groupes `fixed` et `rotating` restent lisibles et exécutables. Lorsqu’un ancien groupe est enregistré depuis cette fenêtre, son ordre réel, les identifiants d’étapes et ses repos sont conservés ; son organisation est représentée par le nouveau séquencement si nécessaire.
- Les séries déjà réalisées gardent leurs identifiants et leur liaison. Les étapes réalisées retirées du plan sont conservées dans `retainedSteps`, comme auparavant.
- Le démarrage d’une séance, les changements de quantités, l’application au modèle et l’estimation de durée utilisent aussi l’ordre sauvegardé.
- Pas de migration de base ni de réécriture automatique des historiques. La sauvegarde privée et la synchronisation existantes transportent le champ optionnel.
- Un échec de sauvegarde restaure la séance avant modification et garde le brouillon ouvert. Les doubles enregistrements sont bloqués.

## Fichiers

`group-editor.js` : présentation et interactions Pointer Events/clavier. `groups.js` : séquence et compatibilité. `app.js` : intégration, validation et sauvegarde du brouillon. `style.css` : styles limités à la fenêtre. `sw.js` et `.github/workflows/pages.yml` : diffusion du nouveau module. Tests nouveaux et parcours existants adaptés à l’interface.

## Vérifications réellement exécutées

- Les 98 commandes existantes ont été exécutées. Deux tests ont échoué pendant la première passe : anciennes commandes d’interface et libellés, ainsi qu’un bouton d’abandon masqué par l’en-tête compact après défilement. Les parcours ont été adaptés et repassés avec succès. Les autres parcours concernés ont aussi été adaptés au fil du développement.
- Deux nouveaux tests passent, soit 100 commandes distinctes réussies après reprises ciblées : `tests/group-sequence.cjs` et `tests/group-editor-ui.cjs`.
- Le test fonctionnel passe dans Chromium et WebKit : création/modification, 5/3 asymétrique, ordre personnalisé/réinitialisation, ajout de quatre membres, déplacement des exercices, mise à jour des lettres, sauvegarde/réouverture et exécution exacte des onze séries prévues.
- Chromium utilise de vrais événements tactiles du navigateur via CDP pour maintenir/déplacer/annuler ; WebKit utilise les événements de souris sur le même code Pointer Events. Défilement contrôlé d’une longue séquence et absence de déplacement de la page vérifiés.
- Captures à 320, 390 et 430 px, contrôle des débordements, simulation du clavier avec focus conservé.
- Échec local de sauvegarde forcé : aucun groupe partiellement écrit, brouillon conservé, nouvelle tentative réussie.
- Ancien groupe tournant injecté localement puis ouvert et sauvegardé : même séquence, mêmes identifiants d’étapes, mêmes repos et historique inchangé.
- Tests de moteur : 2 à 8 membres, variations de quantités, identifiants et séries réalisées conservés, réouverture, intégrité du document et chronologie de l’estimation de durée.
- Vérification de syntaxe, configuration publique et `git diff --check` réussis.

Les données de ces essais sont locales ou simulées : aucune donnée d’un utilisateur Supabase n’a été modifiée. Safari sur iPhone physique et le mode installé n’étaient pas disponibles ; ces deux validations restent nécessaires pour confirmer le comportement des gestes et du clavier réels.

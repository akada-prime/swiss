# État de reprise — Prime Communes 2.0

Dernière mise à jour : 2026-09-22 UTC

## Point sûr

- Branche locale et distante : `rebuild/prime-communes-2.0`
- Baseline : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`
- `main` : intact
- Merge automatique : aucun
- Dernier jalon distant garanti avant le lot CSS : `0e11dcc785422a5f70f2bceda1b7b146b7e66703`

## Validé avant rebuild

- Lecture intégrale du cahier des charges et inventaire du dépôt terminés.
- `npm ci` terminé.
- Baseline : `npm run check` réussi, 55/55 tests.
- Baseline : `npm run build` réussi.
- Inspection complète des runtimes, styles, tests, workflows, données publiques et scanner Radar.
- Recette baseline terminée aux six largeurs ; constats consignés dans `docs/rebuild-baseline.md`.
- Architecture cible figée dans `docs/rebuild-baseline.md`.

## Étape active

1. Publier le checkpoint de consolidation CSS déjà validé par tests et build.
2. Refaire la matrice visuelle sur le SHA CSS immuable, en priorité Communes et Carte.
3. Terminer la recette des états restants, la documentation, le playbook et le rapport avant merge.

## Jalon applicatif courant

- `index.html` ne contient plus le runtime métier historique inline.
- Une seule entrée ES module : `app/main.js`, réduite à un graphe d’imports explicite.
- Le shell partagé vit dans `app/core/runtime.js` ; données, carte, Stats, Communes, Radar!, Histoires et Roadmap conservent chacun leur module.
- L’ancien chargeur dynamique `app/prime-communes-1.1.js` est supprimé.
- Le chargement CSS runtime historique et le `MutationObserver` réparateur Communes sont supprimés.
- La première recette du graphe modulaire a détecté puis corrigé les liaisons manquantes des décorateurs `renderModules` / `renderErp` ; une barrière de test couvre désormais le contrat.
- La recette Natel a aussi détecté la perte du retour visuel de l’actualisation manuelle dans la couche DATA 1.5 ; les états chargement, succès, fallback et erreur sont de nouveau possédés par cette couche.
- Une seule entrée de styles : `app/styles/main.css`.
- La cascade chronologique a été remplacée par quatre responsabilités : `foundation.css`, `components.css`, `views/*.css` et `responsive.css`. `product-assets.css` reste un sous-ensemble technique des composants.
- Les douze anciennes feuilles chronologiques ou de compensation ont été supprimées après consolidation.
- Le chargeur dynamique et ses versions de cache dispersées ne sont plus exécutés.
- La couche finale `app/styles/responsive.css` possède les règles de lisibilité et de navigation Natel.
- Les déclarations prioritaires passent de 184 à 3 au total : une pour le contrat natif `[hidden]`, deux pour la garde anti-flash initiale.
- Les six onglets restent visibles sur Natel dans une grille 3 × 2.
- `npm run check` : 59/59, avec contrôle syntaxique de tous les modules.
- `npm run build` : réussi, sans avertissement de script non bundlé.

## Recette navigateur déjà acquise

- Checkpoint modulaire `d5a00de374267e6c9f2b3e219f4e1bbbffc58ac9` : six largeurs réelles (360, 430, 768, 1 366, 1 920 et 2 560 px), six onglets visibles sans collision ni débordement global.
- Communes : recherche, aucun résultat, reset, filtre Client Prime, contrôle Delimo, portrait Wikipédia, passage à la modification et retour en haut validés.
- Natel : recherche dédiée, navigation des six vues et retour en haut validés.
- Deep-link Histoires, refresh, Retour et Suivant navigateur validés.
- Checkpoint `0e11dcc785422a5f70f2bceda1b7b146b7e66703` : actualisation Natel revalidée avec états `loading` puis `success` et 2 110 communes.
- Aucune erreur applicative console sur ces parcours. Les erreurs de l’extension du navigateur ont été exclues comme externes à l’application.
- Limite d’environnement : le navigateur distant ne fournit pas WebGL2 ; Carte affiche correctement son état d’erreur MapLibre, mais le rendu WebGL final devra être confirmé dans un navigateur matériel.

## Validation propre au lot CSS

- `npm run check` : 59/59 après suppression de toutes les anciennes feuilles.
- `npm run build` : réussi avec 16 modules transformés.
- Sortie : CSS 131,58 kB (gzip 36,02 kB), JavaScript 113,02 kB (gzip 34,89 kB).
- `!important` : 3 occurrences au total, inchangé (une dans la cascade, deux dans la garde anti-flash HTML).
- La recette navigateur du nouveau SHA CSS est la prochaine opération obligatoire ; elle n’est pas encore déclarée acquise.

## Reprise après interruption

Vérifier d’abord :

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

La branche attendue est `rebuild/prime-communes-2.0`. Ne pas rejouer l’audit, l’installation ou les 55 tests de baseline. Reprendre par la matrice visuelle du checkpoint CSS publié, puis seulement terminer la documentation et le rapport.

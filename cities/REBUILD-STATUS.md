# État de reprise — Prime Communes 2.0

Dernière mise à jour : 2026-09-22 UTC

## Point sûr

- Branche locale et distante : `rebuild/prime-communes-2.0`
- Baseline : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`
- `main` : intact
- Merge automatique : aucun
- Arbre métier : encore identique à la baseline

## Validé avant rebuild

- Lecture intégrale du cahier des charges et inventaire du dépôt terminés.
- `npm ci` terminé.
- Baseline : `npm run check` réussi, 55/55 tests.
- Baseline : `npm run build` réussi.
- Inspection complète des runtimes, styles, tests, workflows, données publiques et scanner Radar.
- Recette baseline terminée aux six largeurs ; constats consignés dans `docs/rebuild-baseline.md`.
- Architecture cible figée dans `docs/rebuild-baseline.md`.

## Étape active

1. Séparer l’entrée bundlée en modules de responsabilités et supprimer les anciens patchs.
2. Reconstruire la cascade CSS par couches et retirer les fichiers chronologiques.
3. Compléter les tests de non-régression, puis refaire la recette complète.

## Jalon applicatif courant

- `index.html` ne contient plus le runtime métier historique inline.
- Une seule entrée ES module : `app/main.js`.
- Une seule entrée de styles : `app/styles/main.css`.
- Le chargeur dynamique et ses versions de cache dispersées ne sont plus exécutés.
- `npm run check` : 55/55.
- `npm run build` : réussi, sans avertissement de script non bundlé.

## Reprise après interruption

Vérifier d’abord :

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

La branche attendue est `rebuild/prime-communes-2.0`. Ne pas rejouer l’audit ni les tests de baseline ; reprendre à la première étape non cochée ci-dessus.

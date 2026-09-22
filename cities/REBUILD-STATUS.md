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

1. Remplacer le runtime historique et ses patchs par des modules directs.
2. Reconstruire la cascade CSS par couches.
3. Compléter les tests de non-régression, puis refaire la recette complète.

## Reprise après interruption

Vérifier d’abord :

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

La branche attendue est `rebuild/prime-communes-2.0`. Ne pas rejouer l’audit ni les tests de baseline ; reprendre à la première étape non cochée ci-dessus.

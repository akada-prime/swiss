# État de reprise — Prime Communes 2.0

Dernière mise à jour : 2026-09-22 UTC

## Point sûr

- Branche locale et distante : `rebuild/prime-communes-2.0`
- Baseline : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`
- `main` : intact
- Merge automatique : aucun
- Dernier jalon distant avant ce lot : `8952b3fe4712f3641be433706296c28fc6b6e80f`

## Validé avant rebuild

- Lecture intégrale du cahier des charges et inventaire du dépôt terminés.
- `npm ci` terminé.
- Baseline : `npm run check` réussi, 55/55 tests.
- Baseline : `npm run build` réussi.
- Inspection complète des runtimes, styles, tests, workflows, données publiques et scanner Radar.
- Recette baseline terminée aux six largeurs ; constats consignés dans `docs/rebuild-baseline.md`.
- Architecture cible figée dans `docs/rebuild-baseline.md`.

## Étape active

1. Pousser le graphe de modules et le valider sur le navigateur.
2. Compléter la recette fonctionnelle des six vues et des états requis.
3. Finaliser la documentation d’architecture et le rapport avant merge.

## Jalon applicatif courant

- `index.html` ne contient plus le runtime métier historique inline.
- Une seule entrée ES module : `app/main.js`, réduite à un graphe d’imports explicite.
- Le shell partagé vit dans `app/core/runtime.js` ; données, carte, Stats, Communes, Radar!, Histoires et Roadmap conservent chacun leur module.
- L’ancien chargeur dynamique `app/prime-communes-1.1.js` est supprimé.
- Le chargement CSS runtime historique et le `MutationObserver` réparateur Communes sont supprimés.
- La première recette du graphe modulaire a détecté puis corrigé les liaisons manquantes des décorateurs `renderModules` / `renderErp` ; une barrière de test couvre désormais le contrat.
- La recette Natel a aussi détecté la perte du retour visuel de l’actualisation manuelle dans la couche DATA 1.5 ; les états chargement, succès, fallback et erreur sont de nouveau possédés par cette couche.
- Une seule entrée de styles : `app/styles/main.css`.
- Le chargeur dynamique et ses versions de cache dispersées ne sont plus exécutés.
- La couche finale `app/styles/rebuild.css` possède les règles de lisibilité et de navigation Natel.
- Les déclarations prioritaires passent de 184 à 3 au total : une pour le contrat natif `[hidden]`, deux pour la garde anti-flash initiale.
- Les six onglets restent visibles sur Natel dans une grille 3 × 2.
- `npm run check` : 59/59, avec contrôle syntaxique de tous les modules.
- `npm run build` : réussi, sans avertissement de script non bundlé.

## Reprise après interruption

Vérifier d’abord :

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

La branche attendue est `rebuild/prime-communes-2.0`. Ne pas rejouer l’audit ni les tests de baseline ; reprendre à la première étape non cochée ci-dessus.

# État de reprise — Prime Communes 2.0

## Maintenance après intégration

Le rebuild et l'édition de l'hébergeur sont intégrés à `main` au commit
`a03838c`. La migration d'édition de l'hébergeur a été installée en production.
Les consignes de branche ci-dessous décrivent le chantier historique, clôturé.

Correction de suivi sur `fix/commune-search-render` : retour de la
recherche dédiée sur Natel, avec le champ en haut et les résultats dessous.
Choisir un résultat filtre la liste normale sur la commune et fait défiler
jusqu'à sa ligne ; seul un clic ultérieur sur cette ligne ouvre le portrait.
La vérification en production a révélé que les événements de saisie utilisaient
encore l'ancien rendu des lignes, ce qui rouvrait directement l'édition.
Les événements utilisent désormais le rendu communal enrichi courant.
Le desktop conserve son filtre direct. Aucun changement de données ou de SQL.
Vérifications locales : `npm run check` (63 tests) et `npm run build` réussis.

Dernière mise à jour : 2026-09-22 UTC

## Point sûr

- Branche locale et distante : `rebuild/prime-communes-2.0`
- Baseline `main` : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`
- Checkpoint applicatif et CSS déjà publié :
  `09b1328cf334bddd32f0621c68879ccdd32784de`
- Le commit qui contient ce document est le checkpoint final de clôture.
- `main` est intact ; aucun merge automatique n'a été effectué.

## État du chantier

Le rebuild est terminé et prêt pour inspection humaine. Aucun nouveau chantier
CSS ou JavaScript n'est ouvert.

- `app/main.js` est l'unique entrée JavaScript produit et importe explicitement
  le shell, DATA et les six vues.
- `app/core/runtime.js` isole le shell et la compatibilité requise par les
  runtimes historiques conservés.
- `app/styles/main.css` est l'unique entrée CSS.
- La cascade est organisée selon les quatre responsabilités du cahier des
  charges : fondations, composants, vues et responsive.
- Les douze anciennes feuilles chronologiques ou de compensation ont été
  supprimées après consolidation.
- Les occurrences de `!important` passent de 184 à 3, toutes justifiées.
- Les six onglets restent accessibles sur Natel dans une grille 3 × 2.
- Les données, Supabase, les six vues, les workflows et l'identité visuelle sont
  conservés.

## Correction finale du raster Carte

Le premier build de clôture a révélé un chemin CSS hérité vers
`swiss-base.webp`, devenu invalide après le déplacement de la feuille Carte.

- `vite.config.ts` utilise une base relative (`./`) pour rendre la sortie
  déployable sous un sous-chemin.
- Le runtime Carte résout le raster depuis `import.meta.env.BASE_URL`, avec le
  repli source `public/`.
- `styles/views/map.css` ne porte plus de chemin relatif fragile.
- La sortie contient `dist/swiss-base.webp` et le bundle référence
  `./swiss-base.webp`.
- Une barrière de test protège ce contrat.

## Contrôles finaux

- `git diff --check` : réussi.
- `npm run check` : 60/60 tests réussis.
- `npm run build` : réussi, 16 modules transformés.
- Sortie de clôture : HTML 35,15 kB (gzip 12,37 kB), CSS 131,60 kB
  (gzip 36,01 kB), JavaScript 113,18 kB (gzip 34,96 kB).
- Aucun avertissement de ressource non résolue. L'avertissement npm relatif à
  `http-proxy` appartient uniquement à l'environnement d'exécution.

## Recette visuelle et fonctionnelle acquise

La recette post-CSS du checkpoint `09b1328c` a été menée aux six largeurs
réelles : 360 × 780, 430 × 932, 768 × 1 024, 1 366 × 768,
1 920 × 1 080 et 2 560 × 1 440.

- Six onglets et six vues contrôlés sur Natel et desktop, sans collision ni
  débordement global.
- Recherche Lausanne, état vide, réinitialisation, filtre Clients Prime
  (74 résultats) et contrôle Delimo validés.
- Portrait Zürich, correspondance OFS 261, Wikipédia et passage à la
  modification validés.
- Actualisation manuelle et états `loading`, `success`, `fallback` et `error`
  couverts ; succès observé avec 2 110 communes.
- Scroll profond, retour en haut, deep-links, refresh, Retour/Suivant et
  navigation des six vues validés.
- Carte : interface, données et état d'échec WebGL2 contrôlé.
- Aucune erreur applicative console sur ces parcours hors état MapLibre/WebGL2 ;
  les messages d'extension navigateur ont été identifiés comme externes.

## Documentation finale

- `docs/architecture-design.md` : architecture, responsabilités et règles
  d'extension.
- `docs/rebuild-playbook.md` : commandes, matrice de recette et procédure de
  reprise.
- `docs/rebuild-report.md` : rapport avant/après, suppressions, validations,
  différences et risques.
- `docs/rebuild-baseline.md` : preuve et architecture cible de la baseline.
- `AGENTS.md` : règles locales pérennes pour les prochains travaux.

## Limites connues

- Le navigateur distant ne fournit pas WebGL2. Le fallback MapLibre est validé,
  mais le rendu GPU doit être confirmé sur un navigateur matériel avant merge.
- L'ancienne URL GitHub Pages répond 404 ; la recette a utilisé des URLs CDN
  immuables basées sur les SHA.
- `core/runtime.js` conserve une surface de compatibilité globale isolée et
  testée ; elle ne doit pas être étendue.
- MapLibre et ses glyphes restent des dépendances réseau externes.

## Reprise ou inspection

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
cd cities
npm run check
npm run build
```

La branche attendue est `rebuild/prime-communes-2.0`, propre et alignée sur son
homologue distant. La prochaine action est une inspection humaine, complétée si
possible par un contrôle Carte avec WebGL2 matériel. Ne pas rejouer l'audit ou
la baseline, ne pas travailler sur `main` et ne rien merger automatiquement.

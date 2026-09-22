# Rapport final avant merge — Prime Communes 2.0

## Références

| Élément | Valeur |
|---|---|
| Dépôt | `akada-prime/swiss` |
| Application | `cities/` |
| Baseline `main` | `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9` |
| Branche | `rebuild/prime-communes-2.0` |
| Checkpoint applicatif/CSS validé | `09b1328cf334bddd32f0621c68879ccdd32784de` |
| Merge automatique | aucun |

Le rebuild conserve le dashboard statique, ses six vues, ses données et son
identité. Il ne modifie ni Supabase, ni les données métier de `public/data/`, ni
le workflow Radar. La branche reste volontairement séparée de `main` et doit
être inspectée avant toute décision de merge.

## Architecture avant / après

| Avant | Après |
|---|---|
| runtime métier de 192 lignes dans `index.html` | structure HTML et garde anti-flash uniquement |
| chargeur `prime-communes-1.1.js` injectant scripts et styles | une entrée ES module `app/main.js` |
| ordre de chargement et versions de cache dispersés | graphe d'import déterministe et bundlé |
| shell, transport et vues reliés par effets de bord non documentés | shell isolé, couche DATA et modules de domaine explicites |
| 10 feuilles produit empilées chronologiquement | une entrée CSS et quatre responsabilités |
| réparations Communes par `MutationObserver` | décoration possédée par le module Communes |
| 184 occurrences de `!important` | 3 occurrences justifiées |

La cible détaillée et les règles d'extension sont dans
[`architecture-design.md`](./architecture-design.md).

## Fichiers supprimés

- `app/prime-communes-1.1.js` ;
- `app/globals.css` ;
- `app/prime-communes-1.1.5.css` ;
- `app/prime-communes-1.1.6.css` ;
- `app/prime-communes-1.1.7-mobile.css` ;
- `app/prime-communes-desktop-2.0.css` ;
- `app/prime-communes-maplibre-1.2.css` ;
- `app/prime-communes-news-2.0.css` ;
- `app/prime-communes-roadmap-2.0.css` ;
- `app/prime-communes-stats-1.2.css` ;
- `app/prime-communes-stories-2.0.css` ;
- `app/product-assets.css` (déplacé dans la cascade canonique).

La feuille intermédiaire `app/styles/rebuild.css`, créée pendant la migration,
a également été absorbée avant le checkpoint CSS final.

## Fichiers créés

- gouvernance : `AGENTS.md`, `REBUILD-STATUS.md` ;
- runtime : `app/main.js`, `app/core/runtime.js` ;
- cascade : `app/styles/main.css`, `foundation.css`, `components.css`,
  `product-assets.css`, `responsive.css` et les cinq feuilles `views/*.css` ;
- preuve/reprise : `docs/rebuild-baseline.md`, `docs/visual-harness.html` ;
- pérennisation : `docs/architecture-design.md`, `docs/rebuild-playbook.md`, ce
  rapport ;
- barrières : `tests/rebuild-2.0.test.mjs`.

## Fusions et responsabilités déplacées

| Responsabilité historique | Propriétaire après rebuild |
|---|---|
| logique inline et shell historique | `app/core/runtime.js` |
| orchestration dynamique des scripts | `app/main.js` |
| transport Supabase, fallback, normalisation | `prime-communes-data-1.5.js` |
| URL, historique, édition et retour en haut | `prime-communes-1.1-base.js` |
| portrait Wikipédia et recherche Natel | `prime-communes-communes-1.2.js` |
| styles généraux successifs | `foundation.css` et `components.css` |
| marques produit | `styles/product-assets.css` |
| styles Carte/Stats/Radar/Histoires/Roadmap | `styles/views/*.css` |
| correctifs Natel/desktop successifs | `styles/responsive.css` |

## Dette technique retirée

| Mesure | Baseline | Rebuild | Évolution |
|---|---:|---:|---:|
| taille source de `index.html` | 67 263 octets | 29 873 octets | −55,6 % |
| logique métier inline | 192 lignes | 0 | supprimée |
| `!important` dans `app/` + `index.html` | 184 | 3 | −181 / −98,4 % |
| entrée JavaScript produit | chaîne de 8 runtimes | 1 graphe explicite | déterministe |
| entrée CSS produit | 10 couches | 1 entrée | déterministe |
| `MutationObserver` de réparation | présent | absent | supprimé |
| tests | 55 | 60 | +5 |

Les trois `!important` restants sont le contrat natif `[hidden]` et les deux
règles inline anti-flash des deep-links. Le build ne signale plus de script non
bundlé. Le CSS produit est désormais entièrement comptabilisé dans la sortie
Vite, contrairement à la baseline qui chargeait des feuilles au runtime.

## Code mort retiré

- chargeur dynamique et ses suffixes de cache ;
- runtime métier dupliqué dans le document ;
- injection runtime des anciennes feuilles ;
- observation de mutations utilisée pour réparer Communes ;
- ancienne pile de feuilles chronologiques ;
- règles intermédiaires absorbées avant le checkpoint final.

## Anomalies et régressions temporaires rencontrées

1. La première extraction du runtime n'exposait plus `renderModules`,
   `renderErp`, `openDrawer`, `loadData` et `loadMap` aux modules stabilisés.
   Les liaisons ont été confinées dans le contrat de compatibilité et couvertes
   par un test.
2. Le déplacement du transport a momentanément supprimé le retour visuel de
   l'actualisation manuelle. La couche DATA possède désormais explicitement les
   états `loading`, `success`, `fallback` et `error`.
3. La baseline révélait une collision des six onglets à 360 px. Le contrat Natel
   est maintenant une grille 3 × 2, avec un plancher de 12 px.
4. L'ouverture directe d'une vue profonde pouvait flasher Communes. Une garde
   de premier affichage choisit la vue avant le paint, puis le runtime reprend
   l'URL et l'historique.
5. Le premier build de clôture a signalé que le fond `swiss-base.webp` conservait
   un chemin relatif à l'ancien emplacement de la feuille Carte. Le chemin a été
   retiré de `styles/views/map.css`, résolu par le runtime depuis la base Vite,
   protégé par test et rebundlé comme asset.
6. Le navigateur distant de recette ne fournit pas WebGL2. MapLibre passe dans
   son état d'erreur contrôlé ; ce n'est pas une régression du code, mais cela
   empêche de certifier ici le rendu GPU final.
7. L'ancienne URL GitHub Pages référencée par le dépôt répond 404. La recette a
   donc utilisé des URLs CDN immuables basées sur chaque SHA.

## Tests ajoutés et renforcés

`tests/rebuild-2.0.test.mjs` protège :

- l'entrée JavaScript et CSS unique ;
- l'ordre des responsabilités CSS ;
- la surface de compatibilité nécessaire aux modules ;
- la disparition du `MutationObserver` et du chargeur dynamique ;
- le budget `!important` ;
- le plancher typographique et la grille Natel ;
- la résolution portable du raster Carte `swiss-base.webp` ;
- le deep-link sans flash, le footer et le retour en haut.

Les suites DATA, NEWS/Radar, recherche, stabilisation et Stats ont été adaptées
aux nouveaux propriétaires sans supprimer leurs assertions métier.

## Contrôles exécutés

- baseline : `npm ci`, `npm run check` avec 55/55 tests, `npm run build` ;
- checkpoint CSS : `npm run check` avec 59/59 tests ;
- checkpoint CSS : `npm run build`, 16 modules transformés ;
- clôture : `npm run check` avec 60/60 tests ;
- clôture : `npm run build`, 16 modules transformés, sans ressource non résolue ;
- vérification de format : `git diff --check` ;
- console navigateur : aucune erreur applicative hors MapLibre/WebGL2 ; les
  messages `chrome-extension://` appartiennent à l'environnement de recette.

La sortie de clôture est de 131,60 kB de CSS (36,01 kB gzip), 113,18 kB de
JavaScript (34,96 kB gzip) et 35,15 kB de HTML (12,37 kB gzip). Les contrôles finaux sont consignés
dans `REBUILD-STATUS.md` au dernier commit de clôture.

## Validation visuelle

| Format | Viewport | Six onglets | Collision | Débordement global | Données/footnote |
|---|---:|---:|---:|---:|---:|
| Natel étroit | 360 × 780 | oui | non | non | 175 / `#460` |
| Natel large | 430 × 932 | oui | non | non | 175 / `#460` |
| Tablette | 768 × 1 024 | oui | non | non | 175 / `#460` |
| Laptop | 1 366 × 768 | oui | non | non | 175 / `#460` |
| Desktop | 1 920 × 1 080 | oui | non | non | 175 / `#460` |
| Grand écran | 2 560 × 1 440 | oui | non | non | 175 / `#460` |

Les six vues ont été ouvertes et mesurées sur Natel et sur desktop. Radar! et
Histoires affichent bien leurs titres, contenus et états séparés.

### États fonctionnels contrôlés

- recherche Lausanne, recherche vide et réinitialisation ;
- filtre Clients Prime : 74 résultats ;
- contrôle Delimo et colonnes d'état ;
- portrait Zürich, correspondance OFS 261, Wikipédia et modification ;
- chargement puis succès de l'actualisation manuelle ;
- scroll profond et retour en haut sur Natel et desktop ;
- deep-link Histoires, refresh, Retour et Suivant ;
- navigation des six vues sur Natel et desktop ;
- Carte : interface, données et état d'échec WebGL2 contrôlé.

## Différences visuelles intentionnelles

- Les six onglets Natel occupent deux rangées régulières au lieu de se
  chevaucher.
- Les microtextes critiques respectent un plancher lisible.
- Les contrôles Natel ont une cible cohérente et les champs évitent le zoom iOS.
- Stats rejoint le contraste commun ; Radar!, Histoires et Roadmap gardent leur
  personnalité dans les composants propres à leur vue.
- `Réinitialiser`, l'aide portrait et la licence Wikipédia restent lisibles sans
  devenir des actions principales.

Ces différences corrigent des incohérences validées dans le cahier des charges ;
elles ne constituent pas un redesign.

## Différences restantes et risques

- Le rendu MapLibre matériel doit être confirmé dans un navigateur disposant de
  WebGL2. Le fallback observé est fonctionnel.
- MapLibre et ses glyphes restent des dépendances réseau externes ; les données,
  la frontière nationale et le raster principal restent locaux.
- `core/runtime.js` conserve une surface de compatibilité globale isolée. Elle
  est stable et testée, mais ne doit pas être étendue comme architecture future.
- Le prototype React/Next reste présent et non publié afin de ne pas mélanger ce
  rebuild à une migration de stack.
- La publication GitHub Pages historique n'étant plus disponible, la validation
  de la configuration de déploiement devra accompagner la décision de merge.

## Conclusion

Le produit, les données, Supabase, les six vues et l'identité sont conservés.
La cascade, l'entrée runtime, les tests et les règles d'extension sont désormais
explicites. Aucune nouvelle fonction métier n'a été ajoutée. La branche est prête
pour inspection humaine ; aucune fusion vers `main` n'est effectuée par ce Work.

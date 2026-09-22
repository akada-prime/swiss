# Baseline autoritative du rebuild

## Référence

| Élément | Valeur |
|---|---|
| Dépôt | `akada-prime/swiss` |
| Application | `cities/` |
| Branche source | `main` |
| SHA exact | `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9` |
| Date du commit | `2026-09-22T00:05:32+02:00` |
| Sujet | `Update Natel header contract for six views` |
| Gel relevé | `2026-09-21T22:29:01Z` |

La branche `rebuild/prime-communes-2.0` a été créée exactement depuis ce SHA et publiée sur GitHub avant toute modification.

## Vérifications baseline

- `npm ci` : réussi, 507 paquets installés.
- `npm run check` : réussi, 55 tests passés, 0 échec.
- `npm run build` : réussi avec Vite 8.0.13 en 1,01 s.
- Avertissement baseline : le chargeur `app/prime-communes-1.1.js?v=31` n’est pas bundlé faute de `type="module"`.
- Sortie baseline : `dist/index.html` 72,45 kB et CSS 48,56 kB.

## Mesures de dette initiale

| Mesure | Baseline |
|---|---:|
| `index.html` | 67 263 octets |
| JavaScript inline historique | 192 lignes |
| `!important` dans `app/` + `index.html` | 184 |
| Runtimes historiques chargés en chaîne | 8 |
| Feuilles CSS produit chargées en couches | 10 |
| Tests | 55 |
| Vues | 6 |

Le document contient simultanément le runtime historique complet et un chargeur qui ajoute une seconde couche de données, des ponts globaux et des runtimes de vues. La carte courante supprime l’ancienne carte SVG au démarrage. La vue Communes repasse ensuite sur le DOM via observation de mutations. Les versions de cache sont dispersées entre HTML, chargeur et `@import` CSS.

## Contrats fonctionnels gelés

- Vues : Communes, Carte, Stats, Radar!, Histoires, Roadmap.
- Recherche universelle tolérante aux accents et à une petite faute.
- Filtres marché, canton, solution, clients Prime, eAdmin, Territoire et Systèmes.
- Vue minimale par défaut des communes de 10 000 habitants ou plus.
- Portrait communal Wikipédia à la demande, édition et reprise de clé locale.
- Deep-links, historique, refresh sans flash, export TSV et retour en haut global.
- Carte Suisse desktop, Romandie Natel et frontière nationale officielle locale.
- Radar déterministe sans appel IA automatique ; qualification locale puis publication séparée.
- Histoires et portrait communal strictement hors du domaine Radar.
- Pied de page produit : `Prime Communes · version 2.0.5 · #460`.

## Trace visuelle initiale

La configuration GitHub Pages historique référencée dans `supabase/config.toml` retourne désormais une page 404. La recette est donc effectuée sur une URL CDN immuable construite depuis le SHA de baseline, ce qui garantit que l’observation correspond exactement au code gelé.

Observation desktop à 1 363 × 936 :

- six onglets visibles ; Communes actif ;
- 175 résultats et 120 lignes présentes dans le DOM initial rendu ;
- largeur du document égale à la largeur cliente, sans débordement horizontal global ;
- KPIs corrects après hydratation : 2 110 communes, 8 962 258 habitants, 175 communes ≥ 10 000, 74 clients Prime ;
- chargement initial visiblement vide avant hydratation, puis remplacement tardif des tirets ;
- collisions/coupures de libellés observées dans la navigation et la barre de filtres à cette largeur.

Matrice mesurée dans le navigateur :

| Format | Viewport applicatif | Onglets visibles | Débordement global | Résultats | Police critique min. |
|---|---:|---:|---:|---:|---:|
| Natel étroit | 360 × 780 | 6 | 0 px | 175 | 10 px |
| Natel large | 430 × 932 | 6 | 0 px | 175 | 10 px |
| Tablette | 768 × 1 024 | 6 | 0 px | 175 | 10 px |
| Laptop | 1 366 × 768 | 6 | 0 px | 175 | 10 px |
| Desktop | 1 920 × 1 080 | 6 | 0 px | 175 | 10 px |
| Grand écran | 2 560 × 1 440 | 6 | 0 px | 175 | 10 px |

À chaque largeur, la mise à jour Communes, le footer `#460` et le retour en haut sont présents. Sur Natel 360 px, les six libellés sont tous dans le DOM mais se chevauchent visuellement dans la barre ; le rebuild doit conserver les six accès tout en supprimant cette collision. Le plancher typographique critique de 10 px constitue la valeur avant rebuild.

Le harnais `docs/visual-harness.html` sert uniquement à la recette. Il impose au document applicatif une largeur réelle d’iframe, afin que les media queries et le JavaScript responsive s’exécutent dans la largeur testée sans modifier le produit.

## Architecture cible

```text
index.html
└── app/main.js
    ├── core/        état, URL, données, recherche, DOM partagé
    ├── features/    édition, portrait, export, retour en haut
    └── views/       communes, carte, stats, radar, histoires, roadmap

app/styles/main.css
├── foundation/     reset, tokens, typographie, structure
├── components/     boutons, cartes, navigation, formulaires, états
├── views/          styles possédés par chaque vue
└── responsive.css  adaptations globales desktop/Natel
```

Le runtime doit avoir un seul propriétaire par responsabilité, charger les styles de façon déterministe et conserver les mêmes contrats publics sans ponts globaux ni réparation post-rendu.

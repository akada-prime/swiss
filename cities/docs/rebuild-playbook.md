# Playbook de maintenance et de reprise

Ce playbook décrit la manière de modifier, vérifier et reprendre Prime Communes
sans recréer les couches historiques retirées par le rebuild.

## Démarrage sûr

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
git diff
npm ci
```

Pour le rebuild, la branche attendue est `rebuild/prime-communes-2.0` et sa
baseline immuable est `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`.
Ne jamais réinitialiser un état local inconnu, ne jamais travailler sur `main`
et ne jamais merger automatiquement.

## Boucle de modification

1. Définir l'invariant produit concerné et son propriétaire.
2. Lire [`architecture-design.md`](./architecture-design.md) et les tests du
   domaine avant de modifier le runtime ou la cascade.
3. Faire le changement dans le plus petit nombre de propriétaires légitimes.
4. Ajouter ou adapter une barrière de non-régression portant sur le contrat.
5. Exécuter `npm run check`, puis `npm run build`.
6. Pour un changement visible ou interactif, exécuter la matrice navigateur.
7. Mettre à jour `REBUILD-STATUS.md`, committer un état compréhensible et pousser.

## Commandes

```sh
npm run dev
npm run check
npm run build
npm run preview
```

`npm run check` exécute la vérification syntaxique de tous les modules et les
tests Node. La CI `.github/workflows/prime-communes-stabilization.yml` répète le
contrat et le build avec Node 22.

## Matrice navigateur minimale

| Format | Largeur × hauteur |
|---|---:|
| Natel étroit | 360 × 780 |
| Natel large | 430 × 932 |
| Tablette | 768 × 1 024 |
| Laptop | 1 366 × 768 |
| Desktop | 1 920 × 1 080 |
| Grand écran | 2 560 × 1 440 |

Le harnais [`visual-harness.html`](./visual-harness.html) applique une vraie
largeur au document embarqué. Pour une validation reproductible, utiliser une
URL CDN immuable contenant le SHA exact du commit inspecté.

À chaque largeur, contrôler :

- les six onglets, l'onglet actif et l'absence de collision ;
- l'absence de débordement horizontal global ;
- le plancher typographique et la hauteur des contrôles ;
- le pied de page `#460` et le retour en haut ;
- le chargement des 2 110 communes et les 175 résultats initiaux.

Sur Natel et desktop, parcourir réellement les six vues. Pour Communes et Carte,
contrôler en plus les états suivants :

- neutre, filtre actif, recherche, aucun résultat et réinitialisation ;
- chargement, succès, fallback et erreur ;
- contrôle Delimo ;
- portrait communal, Wikipédia/OFS et passage en modification ;
- scroll profond, apparition puis disparition du retour en haut ;
- deep-link, refresh, Retour et Suivant navigateur.

Un navigateur sans WebGL2 doit afficher l'erreur MapLibre contrôlée. Cette
observation ne remplace pas une validation de la carte sur matériel WebGL2.

## Changer le CSS

1. Choisir la couche : fondation, composant, vue ou responsive.
2. Vérifier si un token ou variant existant exprime déjà le besoin.
3. Ne pas créer de feuille chronologique et ne pas déplacer le problème dans un
   sélecteur plus spécifique.
4. Vérifier `!important`, les tailles inférieures au plancher et les breakpoints.
5. Rejouer au minimum 360, 768, 1 366 et 1 920 px ; rejouer les six largeurs
   avant un jalon ou une demande de merge.

## Ajouter une vue

1. Ajouter une section sémantique cachée dans `index.html`.
2. Ajouter son module propriétaire et, si nécessaire, `styles/views/<vue>.css`.
3. Importer explicitement le module dans `app/main.js` et la feuille avant
   `responsive.css`.
4. Étendre la liste des vues autorisées, la restauration URL/historique et la
   garde de premier affichage.
5. Ajouter le bouton aux six accès sans casser la grille Natel.
6. Tester deep-link, refresh, Retour/Suivant, console et ressources chargées.

## Modifier Radar ou Histoires

- Radar : le scanner planifié ne persiste que `radar-state-v1.json` et
  `radar-candidates-v1.json`. Ne jamais ajouter un appel IA automatique au
  workflow mécanique.
- Histoires : garder récits, angles et sources dans `stories-v1.json` et le
  module Histoires.
- Ne jamais partager un fichier métier entre ces domaines pour « simplifier ».
- Le portrait Wikipédia reste une interaction Communes à la demande.

## Données, Supabase et édition

- Toute modification de migration, schéma ou donnée live sort du périmètre d'une
  maintenance frontend et nécessite un chantier explicite.
- Les tests de rendu doivent utiliser la lecture ou le fallback, jamais une
  écriture de préparation.
- Les données OFS restent verrouillées ; seules les informations prévues par le
  contrat d'édition existant peuvent être sauvegardées.

## Reprise après interruption

1. Lire `REBUILD-STATUS.md`.
2. Inspecter branche, HEAD, status et diff avant toute action.
3. Comparer avec `origin/rebuild/prime-communes-2.0` sans clean ni reset.
4. Si le travail local est cohérent, terminer le contrôle en cours, mettre le
   statut à jour, committer et pousser avant d'ouvrir un autre lot.
5. Si l'environnement local a disparu, repartir du dernier SHA distant garanti,
   jamais de `main` ni d'une reconstruction approximative.

Le rapport de rebuild est conservé dans
[`rebuild-report.md`](./rebuild-report.md).

# Prime Communes — règles de chantier

- Sources de vérité : le dépôt courant et `Prime-Communes-2.0-REBUILD-CdC.md`.
- Baseline du rebuild : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`.
- Travailler uniquement sur `rebuild/prime-communes-2.0`; ne jamais modifier ou merger `main` automatiquement.
- Préserver les données, les six vues, les deep-links, le stockage local, les fallbacks, l’édition, la carte, le Radar et l’identité visuelle.
- Ne modifier ni le schéma ni les données Supabase. Ne pas réécrire les fichiers métier de `public/data/` sauf demande explicite.
- Garder Radar (veille prospective) séparé d’Histoires (éditorial rétrospectif) et du portrait Wikipédia (Communes).
- CSS : fondations → composants partagés → vues → responsive. Tout `!important` doit être rare et justifié.
- JavaScript : responsabilités explicites, modules directs, aucun patch global ni `MutationObserver` réparateur.
- Avant chaque jalon : mettre à jour `REBUILD-STATUS.md`, exécuter les contrôles pertinents et créer un commit propre.
- Validation finale obligatoire : `npm run check`, `npm run build`, six largeurs réelles, états fonctionnels desktop et Natel.
- Ne pas modifier le pied de page produit `Prime Communes · version 2.0.5 · #460` sans exigence explicite.

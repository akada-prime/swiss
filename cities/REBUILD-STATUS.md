# État de reprise — Prime Communes 2.0

> **Chiffrage · hébergement Abacus, 23.10.2026 :** Alex confirme la même règle
> d'hébergement que ProConcept. La version commerciale privée r3 reprend le
> montant ProConcept pour Abacus, sans changer les autres paramètres ni les
> anciens chiffrages. Vérification de l'égalité des montants et de l'absence de
> doublon si les deux ERP sont choisis.

> **Chiffrage 3.0 — essai d’interface, 29.09.2026 :** l’éditeur réorganise le
> chiffrage en Composer, Licences et options, Prestations, PV et taux, Analyse.
> Le résumé client distingue investissement, annuel et cinq ans ; les marges et
> coûts incomplets sont dans Analyse. Les taux commerciaux peuvent être adaptés
> par chiffrage, avec recalcul identique côté client et serveur. Le choix ERP
> relie les modules d’intégration innosolv 21 (Abacus) et 22 (ProConcept).
> Les modules compteurs 501/502/533 restent bloqués tant que leurs règles
> tarifaires Versorger sont non vérifiées. Aucun prix n’est déduit pour eux.

> **Affinage 2.5 — 27.09.2026 :** le panneau Paramètres n’utilise plus d’emoji dépendant du rendu Windows ; la roadmap produit est volontairement synthétique, la 3.0 reste dédiée au Chiffrage et une 3.5 regroupe infrastructure Prime, accès et historique du marché.

> **Jalon produit 2.5 — 27.09.2026 : terminé.** La roadmap affichée dans l’application est alignée sur le socle consolidé 2.5 ; la prochaine grande version est **3.0 — Chiffrage**. Les idées de copilote IA sont déplacées en brainstorming futur non planifié.

## Maintenance après intégration

2026-09-26 : préférences d'apparence simplifiées à deux Skins, Prime Dark et
Helvetia Hell. Le nouveau mode Automatique suit le thème clair/sombre du système
et réagit à ses changements ; l'ancienne préférence Clair est relue comme
Helvetia Hell pour préserver les navigateurs existants.

2026-09-25 : séparation discrète entre les filtres de Communes et les boutons
« Territoire » / « Systèmes ». Trait vertical sur grand écran, horizontal sur
écran plus étroit ; aucune logique de filtre modifiée. `npm run check` (65 tests)
et `npm run build` réussis.

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
# Chiffrage — corrections de configuration du 22 octobre 2026

- Commune et volumes : compteurs et taxes suggérés à un tiers des habitants,
  arrondi au multiple de 500 supérieur, avec respect des valeurs modifiées.
- Énergie : sélection groupée des licences 501/502/533 du catalogue Versorger.
  Les tarifs privés sont toujours marqués non validés : aucune interpolation
  inventée ; PA/PV annuels manuels possibles et brouillon incomplet conservable.
- Hébergement : Oui/Non avant les montants, exclusion effective des calculs sans
  effacer les lignes, compatibilité avec les anciennes révisions. Aucun tarif
  AZ n'est supposé. LCM : ajustements manuels repliés.
- Choix radio/cases de même taille, composition en colonnes sur ordinateur,
  empilement sur Natel. Les identifiants de cache sont synchronisés pour éviter
  de mélanger les nouveaux messages avec un ancien module après publication.
- Sauvegarde : brouillons explicitement incomplets sans faux total, refus de
  l'export correspondant ; messages ciblés pour SQL, paliers, LCM et session.
  Une panne de liste après une écriture réussie n'est plus présentée comme une
  perte de la sauvegarde. Reconnexion possible sans perdre le formulaire.
- Diagnostic en lecture seule : refus HTTP 400 observé sur une sauvegarde du
  22 octobre ; deux causes reproduites (prix SQL par cœur manquant et palier
  Abacus inférieur absent). Le contenu du brouillon refusé n'était pas disponible,
  donc sa cause exacte n'est pas affirmée. Les trois révisions existantes ont
  été recalculées localement avec leur catalogue privé, sans écriture distante.
- Schéma, données privées et paramètres commerciaux distants inchangés.
- Aperçu isolé : `docs/chiffrage-preview.html`, uniquement données fictives et
  API en mémoire, avec six largeurs, FR/DE, deux Skins et simulation d'erreurs.
- Publication coordonnée nécessaire : frontend + fonction Edge et ses modules
  calculate/configuration/errors. Aucun déploiement ni merge de main automatique.

## Refonte du configurateur · en cours · 22 octobre 2026

- Espace de configuration unifié, synthèse latérale sur ordinateur, barre compacte sur Natel ; apparences et FR/DE préservés.
- Présentation client par défaut. Les PA, coefficients et marges ne sont construits dans le DOM qu'après accès interne volontaire ; retour client explicite.
- Références de prestations chargées uniquement depuis le catalogue privé, clonées dans chaque chiffrage ; réapplication confirmée et ajustements conservés lors des désactivations temporaires.
- GP en pourcentage opt-in, assiette de jours Prime explicable, arrondi provenant de la référence ; compatibilité des anciennes lignes fixes.
- Contrôles à ce stade : 105 tests réussis, build réussi. Recette visuelle en cours.
- Aucun tarif privé, aucune source Excel commerciale dans le dépôt. Aucune modification de données Supabase.
- Activation d'une nouvelle référence privée et publication coordonnée à préparer après vérification des sources ; les prix énergie restent non vérifiés.

### Contrôle fonctionnel du configurateur

- 110 tests réussis et build réussi ; contrôles financiers des trois anciennes
  révisions : lignes et montants identiques avec le moteur antérieur.
- 59 vérifications privées des arrondis énergie et de l'assiette GP, sans données
  commerciales dans le dépôt ni écriture distante.
- Préparation reproductible de quatre références privées ; source absente
  explicitement signalée pour certaines prestations Abacus. Référence hébergement
  limitée au périmètre prouvé par le fichier, aucune généralisation tarifaire.
- Export client par liste positive, distinct de l'export interne complet.
- Publication de production et activation privée non effectuées : voir
  `docs/chiffrage-configurateur.md` pour la coordination et les limites de source.

### Recette du configurateur · préparation de publication

- Les six formats ont été mesurés dans le navigateur : 360 × 780, 430 × 932,
  768 × 1 024, 1 366 × 768, 1 920 × 1 080 et 2 560 × 1 440 ; aucun
  débordement horizontal du configurateur.
- Parcours réel sur données fictives : changement ERP avec interface, jours de
  formation personnalisés conservés, GP recalculée, hébergement ajouté/retiré
  sans duplication, sauvegarde et lien de reprise disponibles.
- Accès interne : confirmation affichée, bandeau visible, puis retour client
  retirant les champs PA/marges du DOM.
- Contrôles finaux : 111 tests, build, trois révisions historiques inchangées.
- Une référence d'hébergement liée à un ERP nécessite une confirmation explicite
  si le périmètre change ; les montants ne sont ni effacés ni réappliqués.
- SQL privé prêt pour import inactif, activation protégée et retour aux versions
  antérieures ; aucune écriture ou activation de données effectuée.

### Rapprochement métier final

- Contrôle d'une référence commerciale complète : écarts de 0,00 CHF pour
  investissement, coût annuel et TCO cinq ans, sur le périmètre Excel fourni.
- Nouvelle politique privée PCE : base des finances et options, interface séparée,
  vente des salaires selon la formule source ; aucune modification des versions
  historiques. SQL par utilisateur selon la même source, prix par cœur non inventé.
- Options Prime et partenaires inclus au premier chiffrage selon la référence ;
  jours et prix journalier propres aux partenaires, GP sans double comptage.
- Déplacements calculés après GP sur les jours du projet, partenaires inclus ;
  remise explicitement distincte et modifiable selon la source.
- 114 tests réussis, build réussi, trois révisions historiques inchangées.
- Le rapprochement porte sur ce cas complet, pas sur tous les périmètres possibles.

### Présentation finale

- Les deux apparences ont été mesurées aux six formats ; FR et DE contrôlés,
  dont DE à 360 et 1 366 px, sans débordement horizontal.
- Aperçus de contrôle et captures réalisés sur données entièrement fictives,
  avec le module de vue et le moteur réellement livrés.
- PR de livraison : #41. Production et activation de la nouvelle version privée
  en attente du GO ; aucune modification de données Supabase effectuée.

### Publication et retours Natel · 22 octobre 2026

- PR #41 fusionné dans `main` (`8058b15`) ; CI et Pages réussis, fonction
  `chiffrage` version 9 et références privées du configurateur actives.
- Le premier essai Bex a conservé un ancien catalogue dans un onglet déjà
  ouvert. Les nouvelles créations rechargent désormais les versions actives.
- Une ancienne révision propose une variante explicite avec la référence
  actuelle ; le snapshot original et les valeurs saisies restent intacts.
- Sur Natel, contrôles ERP homogènes, lignes de prestations par module
  compactées, chiffres alignés et répétitions supprimées. Les noms métiers
  remplacent les codes techniques dans le détail client.
- La synthèse affiche le prix LCM disponible même lorsqu'un autre élément
  rend le chiffrage incomplet.
- Préparation Excel : les jours Abacus du fichier Fribourg étaient lus depuis
  une colonne monétaire à cause d'un décalage. La colonne de jours est
  identifiée par le libellé et sa valeur source, puis contrôlée séparément.

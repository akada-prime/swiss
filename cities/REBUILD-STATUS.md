# État de reprise — Prime Communes 2.0

> **Offre client · séparation éditorial/chiffres · 28.10.2026 :** espace
> réservé de 32 px sous le contenu éditorial, défini par un seul paramètre
> du bandeau et appliqué par la règle propriétaire existante du hero.
> Suppression de la surcharge padding-bottom à 18 px. Dernière marge de
> paragraphe et padding de copie restent nuls ; même séparation ouvert/fermé.
> Valeur choisie pour retrouver la respiration de la capture de référence.

> **Offre client · espacement et texte des services · 28.10.2026 :** marges
> cumulées sous le bloc éditorial retirées, espace final de 18 px. Textes des
> cartes Hébergement/LCM harmonisés à 14 px ; titres et emphases à graisse 700.
> Logo AZ conservé à la demande d’Alex, qui prépare les originaux.

> **Optimisation offre communale · 28.10.2026 :** deux paragraphes éditoriaux,
> coûts d’investissement / fonctionnement annuels / total cinq ans sur trois
> colonnes, unités CHF HT, référence rapprochée de l’identité et blocs
> Hébergement/LCM cohérents, alternative Platinum intégrée au bloc LCM.
> Empilement des chiffres et services sous 850 px. Montants inchangés.
> Huit tests ciblés réussis ; publication autorisée par Alex.

> **Offre client · rubrique de journal · 28.10.2026 :** variante validée
> « Filet orange » : libellé blanc, capitales espacées à 14 px, filet orange
> fin prolongé à droite. Espacement adapté sur Natel. Changement uniquement
> visuel du nom de rubrique ; texte, question et dérouleur conservés.
> Cache CSS actualisé. Publication expressément autorisée par Alex.

> **Offre client · invitation toujours visible · 28.10.2026 :** libellé
> « Le bon sens paysan de Prime. ». La question est le summary natif cliquable,
> visible en entier lorsque le bloc est fermé, avec chevron adjacent. À
> l’ouverture, la question occupe la colonne gauche et la réponse la droite ;
> sur Natel, la réponse apparaît dessous. Même graisse 700, taille et approche
> typographique que le titre principal ; aucun texte de question dupliqué.
> Validation ciblée : 10 tests réussis, dont FR/DE, texte exact, typographie
> française et question présente une seule fois dans le summary.
> Publication expressément autorisée par Alex ; améliorations LCM/AZ conservées.

> **Offre client · composition éditoriale validée · 28.10.2026 :** le bloc
> utilise toute la largeur : grande question à gauche, argumentaire à droite.
> Sur Natel (jusqu’à 600 px), question, texte et montants se suivent sur une
> colonne. Deux tailles dans le bandeau : 44/14 px, puis 32/14 px sur Natel.
> Texte français exact et emphases conservés ; ouverture via « Le bon sens
> Prime. », repliée par défaut. Publication explicitement autorisée par Alex.
> Vérification ciblée : 8 tests du rendu public FR/DE et versions 1/2 réussis.

> **Offre client · Le bon sens Prime · 28.10.2026 :** texte français repris
> exactement selon la validation utilisateur, libellé allemand actualisé, phrase
> ajoutée sur le chiffrage estimatif retirée du bloc éditorial. Une seule taille
> de 14 px pour le bloc ; hiérarchie par le gras et l’orange, sans séparateur.
> Le dérouleur reste fermé par défaut, après la référence et avant les montants.
> Vérification ciblée : 8 tests réussis, dont rendu public FR/DE et versions 1/2.

> **Lecture des prestations et des marges · 24.10.2026 :** le résumé par solution
> additionne les jours des lignes de module et des forfaits de groupes dans
> Projet et Prestations, puis distingue les prestations communes. Les jours
> connus restent visibles quand une option manque. L’accès interne conserve
> son ouverture sur les taux et affiche d’abord les marges logicielles en CHF
> et % du PV, selon les mesures existantes du moteur. Les coûts inconnus sont
> explicités, sans présenter ces marges comme la marge globale du projet.
> Une référence supplémentaire de prestations a été ajoutée dans une version
> protégée, sans changement de taux, de référence par défaut ou d’anciennes
> offres. Les données financières d’audit restent hors du dépôt public.
> Validation : 160 tests, 24 parcours + 12 cas partiels, six largeurs, deux
> apparences et FR/DE. [Recette](docs/chiffrage-lecture-prestations-marges.md).

> **Check-up fonctionnel · 24.10.2026 :** reprise de la production `aec6d002`.
> Les points bloquants sont listés et reliés aux champs précis, avec ouverture
> des détails et focus. L’alerte SQL suit le prix retenu, y compris zéro, et se
> réactive si ce prix est effacé. Le zéro de référence ou d’une prestation
> facultative absente est visible, sans inventer les prix inconnus. Les offres
> sans référence ne font plus planter Synthèse ni déclencher à tort l’étiquette
> « ancien standard ». Partage à finaliser et export conduisent à la correction ;
> les liens publics et leurs compteurs sont conservés. La cascade des champs
> utilise réellement les surfaces communes, teintées et bordées dans les deux
> apparences. Moteur/catalogues inchangés. 157 tests, 24 parcours sur six largeurs.
> Voir [la recette](docs/chiffrage-checkup-20261024.md).

> **Chiffrage · cadre commun bêta design, 23.10.2026 (r6) :** les six onglets
> partagent l’en-tête issu de l’Offre. Navigation et identité précèdent une grille
> de contenu indépendante ; le résumé Natel suit le contenu. Plus de bandeau
> tarifaire au-dessus des onglets ni de deuxième champ de titre dans Projet.
> Hébergement et « Prime et partenaires » sont deux postes distincts dans les
> trois présentations financières. Les messages suivent les changements FR/DE,
> avec suffixe de copie localisé et affichage localisé des références prévues.
> 128 tests, build, 144 contrôles de structure et parcours d’édition/comparaison
> réussis. [Recette r6](docs/chiffrage-structure-r6.md). Moteur inchangé.

> **Chiffrage · offre et liste, 23.10.2026 (r5) :** repère vert agrandi,
> fond avec le PNG original du symbole Prime, trois compositions documentées.
> L’offre résume les thèmes des solutions sélectionnées sans limiter la liste
> aux quatorze premières lignes. La liste affiche le canton, l’investissement,
> l’annuel et le total cinq ans (investissement + quatre annuités), depuis les
> révisions enregistrées, avec chargement paresseux limité à trois lectures.
> Prix indisponibles et totaux provisoires restent explicites. Références
> tarifaires consultables dans un volet replié. Moteur et données inchangés.
> Validation : 126 tests, build, 48 contrôles de rendu, erreur de lecture et
> état incomplet. Voir [la recette r5](docs/chiffrage-affinage-r5.md).

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

### Configurateur · présentation de l’offre et corrections · 23 octobre 2026

- Évolution du moteur partagé : SQL sans prix par cœur et hébergement sans
  référence laissent les montants connus visibles, avec état incomplet et export
  bloqué. Aucun tarif SQL extrapolé de Fribourg ni modification des catalogues
  privés et des anciennes révisions.
- Estimation des collaborateurs selon la grille fournie, en conservant les
  nombres personnalisés. Gold et Platinum, SQL et hébergement montrent les
  valeurs effectives directement dans leurs contrôles.
- Choix initiaux, dimensionnement et références visibles ensemble ; modules
  retenus par logiciel et domaine, recherche des options ; prestations en
  lignes compactes. Carte communale issue de la géométrie publique existante,
  avec repli sur le canton sans faux blason.
- Une vue Offre client distincte utilise les mêmes résultats : investissement,
  annuel dès la deuxième année et un seul coût sur cinq ans. Comparaison de
  deux ou trois variantes enregistrées de la commune, écarts de montants et de
  périmètre, signalement des versions tarifaires différentes.
- Vérification : 116 tests, build, rapprochement Tolochenaz à 0,00 CHF sur le
  périmètre déjà fourni. Aperçu fictif servi sur un commit immuable dans le
  navigateur distant : configuration desktop, offre, les six largeurs et
  apparence claire/allemand à 360 px contrôlés sans débordement. Le repère
  territorial et le contraste du titre en clair ont été corrigés. L’interface réelle
  authentifiée et les tarifs privés restent à contrôler après publication.

### Chiffrage · reprise visuelle · 23 octobre 2026

- Reprise de la livraison #45 : logo officiel, tableaux alignés, titres lisibles,
  licences et partenaires compacts, comparaison structurée de 2–3 variantes.
- Chemins publics corrigés pour la carte, les emblèmes cantonaux et le logo,
  selon le mode source GitHub Pages ou le build Vite. Six blasons communaux
  vérifiés et stockés avec leur provenance ; recherche OFS vérifiée pour les autres.
- Résultats sauvegardés utilisés en priorité en comparaison, requêtes concurrentes
  protégées et variations financières visibles après modification.
- 122 tests et build réussis ; matrice statique de 144 contrôles (six largeurs,
  deux apparences, FR/DE), plus parcours de saisie/sauvegarde/comparaison sur
  données fictives. Captures et limites : `docs/chiffrage-validation-visuelle.md`.
- Moteur et catalogues privés inchangés. Pas de modification de données live.
  Les catalogues privés, le rapprochement Excel et l’export réel n’ont pas été
  revérifiés faute de session privée ; ne pas annoncer une recette métier complète.

## Consolidation graphique offre — 27.10.2026

Branche `refactor/chiffrage-shared-presentation`, base `034bdd4`. Composants
purs et CSS communs extraits, bandeau/fonds unifiés, anciennes surcharges
retirées. Moteur et serveur inchangés. 170 tests et build réussis.
Recette navigateur et Safari non réalisée : intégration en attente de contrôle
visuel. Diagnostic et critères : [rapport](docs/chiffrage-shared-presentation.md).

## Finition commerciale offre — 28.10.2026

Logo AZ horizontal officiel, traitement clair/négatif dans le composant partagé.
LCM : bénéfice support/hotline explicite, Gold et Platinum comparés dans le
même détail, phrase de remplacement unique. Règle typographique française
centralisée dans i18n et les adaptateurs chiffrage/client ; ponctuation double
protégée, sans toucher aux chiffres ni aux données sauvegardées.
Recette technique : 175 tests et build. Pas de validation Safari réelle.

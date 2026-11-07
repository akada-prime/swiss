# Architecture et grammaire visuelle — Prime Communes 2.0

Ce document décrit le socle issu du rebuild lancé depuis la baseline
`b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`. Il complète le contrat de
non-régression de [`STABILISATION-1.1.md`](../STABILISATION-1.1.md) et doit être
lu avant toute modification structurelle.

## Invariants du produit

- Les six vues restent `Communes`, `Carte`, `Stats`, `Radar!`, `Histoires` et
  `Roadmap`, avec les mêmes URL et deep-links.
- Les données live restent lues depuis `public."GemeindeAktuell"`; le fallback
  local reste `public/data/municipalities-v4.json`.
- Les données métier de `public/data/`, le schéma Supabase et les migrations ne
  sont pas une zone d'extension visuelle ou frontend.
- Desktop et Natel sont deux dispositions du même produit, pas deux thèmes.
- Le pied de page `Prime Communes · version 2.0.5 · #460`, la navigation des six
  vues et le retour en haut global font partie du contrat.
- Radar!, Histoires et le portrait communal/Wikipédia sont trois domaines
  différents, même lorsqu'ils partagent des primitives visuelles.

## Graphe d'exécution

```text
index.html
└── app/main.js                         entrée ES module unique
    ├── core/preferences.js             valeurs locales et contrat de préférences
    ├── core/settings.js                panneau Paramètres
    ├── core/i18n.js                    traduction et formatage localisé
    ├── core/runtime.js                 shell et contrat de compatibilité
    ├── prime-communes-data-1.5.js      lecture, fallback et normalisation
    ├── prime-communes-maplibre-1.2.js  Carte
    ├── prime-communes-1.1-base.js      URL, édition et comportements partagés
    ├── prime-communes-stats-1.5.js     Stats
    ├── prime-communes-communes-1.2.js  Communes et portrait Wikipédia
    ├── prime-communes-news-2.0.js      Radar!
    ├── prime-communes-stories-2.0.js   Histoires
    └── prime-communes-roadmap-1.2.js   Roadmap
```

L'ordre des imports est explicite et testé. Il remplace le chargeur dynamique,
les versions de cache dispersées et le runtime métier inline historiques.
`index.html` conserve la structure sémantique et les gardes synchrones de
premier affichage nécessaires aux deep-links, au Skin et à `html lang`.

### Responsabilités JavaScript

| Propriétaire | Responsabilité | Ne doit pas absorber |
|---|---|---|
| `index.html` | structure, libellés et garde anti-flash | transport, règles métier, moteur de vue |
| `app/main.js` | ordre de chargement déterministe | logique fonctionnelle |
| `core/runtime.js` | shell existant, état partagé et surface de compatibilité isolée | nouveaux domaines métier |
| `data-1.5.js` | Supabase en lecture, fallback, normalisation, snapshot partagé | rendu d'une vue |
| `1.1-base.js` | URL/historique, édition autorisée, stockage local, retour en haut | Radar ou Histoires |
| `communes-1.2.js` | enrichissement Communes, recherche Natel, portrait Wikipédia | récits Histoires |
| `maplibre-1.2.js` | géométrie, carte, recherche et interactions MapLibre | données éditoriales |
| `stats-1.5.js` | périmètres et calculs de présentation Stats | mutation des données sources |
| `news-2.0.js` | registre, état, candidats et signaux Radar | histoires rétrospectives |
| `stories-2.0.js` | récits, angles et sources éditoriales | veille prospective |
| `roadmap-1.2.js` | rendu de la feuille de route | état des autres vues |

Le shell expose encore une petite surface `window` documentée afin que les
modules stabilisés puissent remplacer certaines fonctions historiques sans
double gestionnaire. Cette compatibilité est volontairement confinée dans
`core/runtime.js`. Une nouvelle fonction ne doit pas agrandir cette surface si
un module propriétaire ou l'API `PrimeCommunesData` suffit.

## Cascade CSS

`app/styles/main.css` est l'unique entrée et impose cet ordre :

```text
foundation.css
components.css
product-assets.css
views/map.css
views/stats.css
views/radar.css
views/stories.css
views/roadmap.css
offer.css
views/chiffrage.css
chiffrage-workspace.css
responsive.css
skins.css
settings.css
```

| Couche | Rôle |
|---|---|
| Fondations | reset, variables, typographie, shell et structure générale |
| Composants | navigation, boutons, filtres, tableaux, cartes, drawers et états partagés |
| Assets produit | dimensions et traitement des marques Prime/partenaires |
| Vues | règles légitimes propres à un seul domaine |
| Responsive | adaptations de disposition et lisibilité, après les vues |
| Skins | trois palettes de tokens sémantiques, dont Dark Jura sur choix explicite ; Automatique résout Prime Dark ou Helvetia Hell avant l'affichage |
| Paramètres | chrome du panneau de préférences, responsive |

### Espace de chiffrage interne

`chiffrage/workspace-ui.js` possède l'identité compacte du dossier, la navigation
des rubriques, la fermeture des menus et le focus au changement de rubrique.
`chiffrage/view.js` conserve les événements, les données et les appels existants ;
`offer-options-editor.js` possède les options préparées et leurs formulaires.
Les fonctions publiques de `offer/presentation.js` restent réservées à l'aperçu
et à l'offre client, sans réintroduire leur grand bandeau dans la saisie interne.

`chiffrage-workspace.css` possède le shell vendeur, les onglets persistants, le
résumé latéral/mobile, les actions et les formulaires d'options. Les contrôles
métier, listes et grilles de prestations restent dans `views/chiffrage.css`,
avec leurs variantes responsive regroupées. Le fichier responsive général ne
redéfinit plus ces lignes de prestations. L'échelle 4/8/12/16/24/32/48 alimente
des alias de relation : éléments liés, titre, champs, panneaux et cartes.

Le shell général est compacté uniquement si l'éditeur est présent dans la vue
visible. Son menu Navigation conserve les destinations et les préférences.
Le `body` utilise alors `overflow-x:clip` pour éviter le conteneur de défilement
intermédiaire créé par `overflow-x:hidden`, qui empêchait les onglets sticky.
La navigation occupe la voie du haut ; une seule barre de sauvegarde occupe le
bas. Sur Natel, le focus d'un champ remet cette dernière dans le flux afin de
laisser la place au clavier. Ce comportement doit aussi être vérifié sur iOS.

Règles :

- pas de nouvelle feuille nommée par date ou version de correction ;
- pas de sélecteur ponctuel lorsqu'un token, composant, état ou variant exprime
  réellement le besoin ;
- pas de redéfinition silencieuse d'un composant partagé dans une vue ;
- pas de nouvelle déclaration `!important` sans justification et test ;
- `[hidden]` est l'exception de cascade autorisée ; les deux autres occurrences
  actuelles sont la garde inline de premier affichage des deep-links ;
- les media queries changent la disposition et la densité, pas le sens métier.
- toute nouvelle couleur globale d'interface exprimant une décision d'apparence
  passe par les tokens de Skin. Les couleurs de statut, de données, de carte,
  de fournisseurs et de produits gardent leur sens indépendamment du Skin.

### Contrat visuel partagé — bêta 2026

Les réglages de la vue Chiffrage ne doivent pas réinventer les contrôles ordinaires.
Le propriétaire canonique de chaque choix visuel est désormais défini :

| Aspect | Propriétaire | Contrat |
|---|---|---|
| Grands titres de vue | `foundation.css` (et `view-intro`) | Un même `h1` et un même retour à la ligne pour les sept vues ; pas de plafond de taille par vue |
| États sélectionnés | `components.css` | `view-tab.active`, `stats-segment button.active` et `chiffrage-work-tabs button[aria-current=page]` utilisent `--pc-control-selected-*` |
| Champs éditables | `skins.css` → `components.css` / vues | `--pc-field-bg` et `--pc-field-border` sont les surfaces sémantiques communes aux filtres, aux Stats et au Chiffrage |
| Actions principales | `skins.css` → composants des vues | `--pc-primary-action` définit le même dégradé pour l'enregistrement communal et les commandes Chiffrage |
| Titres de section | `components.css` | `--pc-section-heading-size`, sans échelle concurrente par écran |
| Mobile | `responsive.css` | Trois colonnes de navigation, la septième entrée Chiffrage sur une ligne complète, aucune valeur de thème codée en dur |
| Mise en page métier | `views/*.css` | Chaque vue conserve ses grilles, ses surfaces spéciales et sa densité spécifique, sans redéfinir les états de base |

Les tokens `--quote-*` restent des alias de compatibilité pour la présentation
financière, qui possède légitimement ses accents numériques propres. Les champs
de devis utilisent les tokens `--pc-field-*` et les onglets les états communs.
Les couleurs de statuts et les données cartographiques ne changent pas.
Les seules utilisations autorisées de `!important` restent les protections
existantes des éléments masqués et du premier affichage.

Avant de créer une nouvelle règle de vue pour un bouton, un champ, un titre ou
un état actif, vérifier que le composant partagé ne couvre pas déjà son besoin.
La recette de cette consolidation porte sur les vues Stats, Communes et
Chiffrage en Helvetia et Prime Dark, à 360, 430, 768, 1366 et 1920 px.
Les contrôles statiques ne remplacent pas la vérification sur iPhone.

## Préférences et langues

`app/core/preferences.js` expose `getPreference`, `setPreference` et un abonnement
aux changements. Les valeurs validées `skin` et `language` sont conservées sous
`prime-communes-skin` et `prime-communes-language` dans `localStorage`, avec
`prime-darkweb` et `fr` par défaut. L'apparence accepte `auto`, `prime-darkweb`,
`jura-dark` et `helvetia` : `auto` suit `prefers-color-scheme` et résout Prime Dark en mode
sombre ou Helvetia Hell en mode clair. L'ancienne valeur `light` est relue comme
`helvetia` pour préserver les navigateurs existants. La garde synchrone dans le
`<head>` pose le Skin résolu et `lang` avant les styles et le rendu ; le module
reprend le même contrat après chargement. Il n'existe pas de compte, d'avatar ou
de profil fictif.
Les vues consomment les rôles partagés de `skins.css` pour les surfaces, le texte,
les bordures, le focus et les états interactifs. Les couleurs de marque, de
séries graphiques et les indicateurs métier gardent des rôles dédiés.
Lorsque les profils existeront, un adaptateur pourra résoudre profil distant >
préférence locale > valeur par défaut sans changer les consommateurs.

`app/core/i18n.js` expose les traductions à clés stables dans les catalogues
séparés `app/i18n/fr.js` et `app/i18n/de.js`. Les libellés statiques portent un
marqueur de clé dans le HTML ; les rendus dynamiques utilisent les mêmes clés.
Le formatage destiné à l'utilisateur emploie `fr-CH` ou `de-CH`. Les noms
officiels, faits stockés, identifiants, produits et sources restent des données,
séparées du texte d'interface. Tout nouveau texte d'interface traduisible doit
passer par i18n ; les données métier et contenus explicitement non traduisibles
sont exclus. Les contenus éditoriaux traduits conservent les mêmes faits et les
mêmes références de source.

Paramètres dans le header héberge les préférences personnelles. Une éventuelle
Administration, réservée aux rôles appropriés, est un domaine fonctionnel
distinct ; aucune console Admin ou authentification n'est créée ici.

## Grammaire visuelle

Prime Communes vient d'une logique de collection et de vignette : unités
d'information autonomes, denses, comparables et immédiatement identifiables.
Cette filiation inspire les cartes, cadres, badges, chiffres et blocs de preuve ;
elle ne constitue pas un gabarit pixel-perfect.

### Primitives communes

- Texte principal : clair, contrasté, réservé au contenu ou à la décision.
- Texte secondaire : visible sans concurrencer le contenu principal.
- Microtexte critique : plancher de 12 px ; champs Natel à 16 px.
- Échelle de lecture commune aux Skins : libellés en capitales à partir de
  12 px, contenu et valeurs usuelles à partir de 14 px, actions textuelles à
  partir de 14 px. Les grands titres gardent leur propre hiérarchie ; les
  détails d'attribution ou icônes purement accessoires peuvent rester compacts.
  Les tokens `--pc-type-*` portent ces rôles dans la couche responsive partagée.
- Les intitulés en capitales des vues sont des titres à 18 px, au-dessus du
  texte d'introduction de 16–17 px. Les intitulés de section utilisent 15 px ;
  12 px est un plancher pour les métadonnées, pas une taille de titre.
- Une étiquette ne doit pas gagner sa visibilité par la seule graisse ou par
  un espacement extrême entre lettres ; vérifier sa taille et son contraste
  réel sur PC et Natel.
- Dans un Skin clair, panneaux, encarts et lignes alternées suivent les
  surfaces sémantiques `--skin-card`, `--skin-tint` et `--skin-hover` ; texte
  principal, secondaire et atténué suivent `--skin-text`, `--skin-secondary`
  et `--skin-muted`. Un ancien fond sombre ne doit pas conserver un texte
  prévu pour fond sombre lorsque le Skin est clair.
- Contrôle interactif Natel : hauteur cible minimale de 40 px.
- Action primaire : gradient Prime et verbe explicite.
- Action secondaire : bordure et fond discret ; `Réinitialiser` doit rester
  identifiable sans ressembler à une action dangereuse.
- Action dangereuse : ne jamais la simuler avec le style d'une action courante.
- Carte/panneau : fond sombre stratifié, bordure fine, rayon cohérent et contenu
  structuré plutôt qu'une accumulation d'ombres.
- Focus : visible ; ne pas dépendre uniquement de la couleur.
- États : `loading`, `success`, `fallback` et `error` doivent appartenir au
  composant ou à la couche qui exécute réellement l'action.
- Responsive : six onglets en grille 3 × 2 sur Natel, une ligne dès que la place
  est suffisante.

Les tokens racines (`--ink`, `--muted`, `--line`, `--blue`, `--orange`,
`--violet`) portent l'identité commune. Les tokens `--pc-*` expriment un contrat
de composant ou de vue. Une nouvelle valeur récurrente doit devenir un token ;
une valeur réellement locale peut rester locale.

## Frontières éditoriales obligatoires

| Domaine | Temps regardé | Sources | IA | Stockage/rendu |
|---|---|---|---|---|
| Radar! | futur et signaux faibles | sources publiques surveillées | seulement après détection déterministe d'un candidat utile | fichiers `radar-*`, `news-radar-v1.json`, module `news-2.0.js` |
| Histoires | passé et transformation d'un territoire | sources attachées au récit | aucune confusion avec la veille | `stories-v1.json`, module `stories-2.0.js` |
| Portrait communal | état public d'une commune | Wikipédia vérifié contre l'OFS | pas de génération | expérience Communes, chargement à la demande |

Le workflow Radar reste « mécanique d'abord, IA ensuite ». Une source inchangée
ne déclenche pas d'analyse IA. Une erreur d'accès est un état mesurable, jamais
une absence silencieuse de changement.

## Étendre sans recréer les couplages

- Nouvelle vue : créer un module et, si nécessaire, une feuille `views/`, puis
  enregistrer explicitement l'import, le deep-link, la navigation et les tests.
- Nouvelle typologie d'acteur/client : étendre le contrat de données et ses
  composants ; ne pas la coder comme un booléen opportuniste dans Communes.
- Objet non communal ou nouveau domaine métier : lui donner son propre module,
  ses données et sa vue si nécessaire ; ne pas le faire transiter artificiellement
  par le tableau des communes.
- Finance, contrats ou temporalité : modèle dédié et provenance explicite ; pas
  de colonnes improvisées dans le profil communal.
- Utilisateurs, SSO, rôles et droits : chantier authentification/RLS distinct ;
  aucune fausse sécurité frontend.

L'architecture doit rester extensible sans devenir générique par anticipation.
On extrait une abstraction lorsqu'un besoin réel la justifie et on documente le
nouvel invariant.

## Anti-patterns

- nouveau loader runtime, injection de `<script>` ou de `<link>` applicatif ;
- logique métier remise dans `index.html` ;
- `MutationObserver` utilisé pour réparer un rendu propriétaire ;
- version de cache ajoutée au hasard dans plusieurs fichiers ;
- fichier `fix`, `final`, `v2-bis` ou règle CSS placée « tout en bas » ;
- partage de fichiers de données entre Radar! et Histoires ;
- écriture Supabase ou modification de données pour tester une apparence ;
- test qui fige chaque pixel au lieu de protéger un contrat.

## Limites connues et assumées

- Le dashboard statique reste la source publiée. Le prototype React/Next est
  conservé mais n'est pas le runtime produit.
- Le shell de compatibilité global est isolé, pas entièrement supprimé. Il ne
  doit pas redevenir un point d'extension généraliste.
- MapLibre 6.7.0 est chargé depuis `unpkg.com` et exige WebGL2. L'état d'erreur
  est contrôlé, mais le rendu matériel doit être testé sur une machine WebGL2.

### Accent graphique et couleur de lecture

Les skins distinguent `--skin-accent` (bordures et aplats),
`--skin-accent-text` (liens et accents textuels) et `--skin-selected-text`
(texte sur fond sélectionné). Le composant partagé d'état sélectionné utilise
ce dernier token : pas de bleu sombre imposé au texte en Dark.
`--skin-disclosure` conserve la signification orange du déplié avec une teinte
adaptée au contraste du fond. L'éditeur possède une géométrie de triangle
8 × 10 px commune ; l'offre conserve son propriétaire et la même géométrie.
Les trois paires texte/fond et indicateur/fond sont testées dans
`tests/chiffrage-readability.test.mjs`. Ces tests ciblés ne certifient pas
l'accessibilité complète de l'application.

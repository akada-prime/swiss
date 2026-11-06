# Chiffrage interne — conception et recette

Recette du 6 novembre 2026. Base produit : main `ed7417f1c8a638924738f4199e3526cddedb13e9`.

## Diagnostic et choix

Le rendu est possédé par `app/chiffrage/view.js`, avec les composants publics
`offer/presentation.js` dans l'aperçu. Les feuilles effectivement chargées sont
`styles/main.css` : fondations, composants, offre, Chiffrage, responsive et skins.
Le grand shell, les commandes, le champ de variante permanent, le résumé puis
le bandeau commercial répétaient le contexte avant les champs. À 430 px, le
premier contrôle métier commençait à 1409 px. Le CSS des prestations était
redéfini dans la vue puis dans le responsive général ; les options mélangeaient
libellés, champs et aides dans des blocs alignés sur leur hauteur totale.

La composition retenue est un dossier vendeur : retour/navigation courts,
identité communale sur dégradé Prime, renommage explicite, repères financiers,
6 rubriques de travail et 7 en mode avancé, puis la saisie. Aucun parcours
numéroté. « Accompagnement » devient « Prestations » ; « Tarifs » reste réservé
au mode avancé. Les clés de rubrique et les handlers métier sont conservés.

Les onglets restent seuls dans la voie persistante du haut ; Enregistrer,
état et Actions occupent celle du bas. Le résumé reste latéral sur ordinateur,
compact et dépliable au-dessus des onglets sur Natel. Le corps utilise clip au
lieu de hidden sur l'axe horizontal uniquement dans l'éditeur : hidden créait
un ancêtre de scroll qui annulait le sticky. La barre du bas revient dans le
flux lorsqu'un champ est focalisé sur Natel, afin de laisser la place au clavier.

## Résultat mesuré

Ordonnée document du champ `dimensions.population`, recette normale FR/Dark,
Projet, dépliés fermés. Les six viewports sont des iframes de taille effective,
pas une simple réduction de capture. Mesure DOM réelle avant/après, même fixture.

| Largeur | Avant | Après | Gain |
| --- | ---: | ---: | ---: |
| 360 | 1476 px | 589 px | 887 px |
| 430 | 1409 px | 570 px | 840 px |
| 768 | 1129 px | 545 px | 584 px |
| 1366 | 922 px | 391 px | 532 px |
| 1920 | 946 px | 391 px | 555 px |
| 2560 | 946 px | 391 px | 555 px |

À 430 × 932 : commune, OFS, habitants, variante, révision, référence, investissement,
annuel, onglets et premiers champs visibles ; barre d'actions de 69 px en bas.
À 360 × 780, le champ commence à 589 px, au-dessus de la barre située à 711 px.
Les titres longs grandissent naturellement ; ils ne sont pas coupés pour tenir
artificiellement cette mesure. Les avertissements ou le mode avancé peuvent
ajouter de la hauteur. Le focus d'une rubrique amène directement son contenu.

## Espacements et propriétaires

Échelle commune : 4 / 8 / 12 / 16 / 24 / 32 / 48 px. Les rayons, dimensions des
logos et voies persistantes sont des dimensions de composants, pas des gaps.

| Relation | Valeur | Propriétaire |
| --- | ---: | --- |
| Éléments liés, libellé/champ/aide | 8 px | gap du groupe / subgrid |
| Cartes d'options | 12 px | gap de la sélection |
| Titre/contenu et colonnes de champs | 16 px | marge du titre / gap de grille |
| Intérieur des panneaux | 16 px Natel, 24 px ordinateur | section propriétaire |
| Identité : marge horizontale | 16 px Natel, 32 px ordinateur | bandeau compact |
| Commandes, entrées et dépliés | 44 px minimum | composant interactif |

`chiffrage-workspace.css` possède le shell, les menus et options ;
`views/chiffrage.css` garde les contrôles métier, listes et prestations.
Le fichier responsive général ne redéfinit plus les prestations. Aucun nouvel
!important, aucun style inline de réparation, aucun script de dimensions.
Les alias sémantiques relient les espacements aux tokens communs.

## Contrôles effectués

- `npm run check` : 223 tests réussis, dont 4 nouveaux contrats de navigation,
  échappement de l'identité, focus et fermeture des menus au clavier.
- `npm run build` : succès ; `git diff --check` : propre.
- Matrice finale Chrome : 168 cas (6 formats × FR/DE × Dark/Helvetia × 7 rubriques).
  Aucun débordement global ; aucun champ échantillonné sous 16 px ; focus du
  panneau actif conforme ; aucun chevauchement panneau/onglets.
- Formats : 360×780, 430×932, 768×1024, 1366×768, 1920×1080, 2560×1440.
- Sticky vérifié après défilement réel sur les six formats : top 0 px à chaque
  largeur, avec 256 à 1052 px de défilement suivant le viewport.
- Revue visuelle : Projet, Modules ouverts, Prestations, options compactes et
  édition, aperçu client, comparaison de deux variantes, Synthèse et Tarifs.
  Cas Helvetia/DE inspectés sur ordinateur. Les défauts constatés ont été
  corrigés, notamment la ligne Déplacements à 768 px et le sticky du body.
- Jours et annuel d'une option Prime à 360 px : même top 367,94 px, largeur
  124,5 px chacun malgré l'aide annuelle. Zéro jour et zéro annuel restent
  valides ; bénéfice absent : message « À compléter : bénéfice client ».
- Saisie conservée après Modules → Offre, état Modifié compact, enregistrement
  simulé donnant Enregistré, renommage long sans débordement, Escape fermant
  Actions avec restitution du focus. Référentiel et retour au dossier parcourus.
- Erreur serveur simulée : message visible, indicateur rouge, barre de 136 px
  à 360 px et dégagement de 208 px pour garder les dernières lignes accessibles.
  Les contrôles Modules ouverts n'ont aucune cible mesurée sous 44 px.
- Liens et Révisions : résultat focalisé et amené dans la zone de travail.
  Comparaison : deux variantes chargées, écart d'investissement +3520 CHF ;
  l'annuel reste identique. Avertissement ancien standard court/détaillé vérifié.
- Jour de module absent : investissement explicitement provisoire, un point à
  compléter ; la valeur inconnue n'est pas déguisée en zéro.
- Offre publique : feuille partagée rechargée sans débordement observé ; commande
  PDF atteignant « PDF prêt » sur réponse locale. Le navigateur n'a pas émis
  d'événement download exploitable ; le fichier PDF final n'a pas été récupéré
  dans cette recette. Générateur et transport PDF inchangés.

## Données, limites et appréciation

La recette monte le véritable éditeur et le véritable moteur avec un transport
local simulé. Ballaigues est la référence d'identité ; le catalogue Abacus et les
prix des captures sont synthétiques (52800 / 28240 CHF), pas l'offre réelle de
Ballaigues. Aucune offre, publication ou donnée Supabase n'a été modifiée.

Aucun Safari ni iPhone physique n'est disponible ici. Clavier iOS, safe areas
réelles et téléchargement PDF natif restent à essayer sur appareil. Les
commandes de session, activation/suppression de liens, archivage et export
serveur gardent leurs handlers mais n'ont pas été exercées contre la production.
Les préférences ont été testées via le runtime de recette ; le dialogue complet
des paramètres et la navigation entre les autres vues ne sont pas montés dans
ce banc local. Les captures de grande largeur peuvent être rognées par le
viewport extérieur du navigateur ; les mesures portent sur le viewport complet.

Appréciation : 9,3/10 sur l'expérience observée. L'accès, la composition et la
cohérence sont nettement améliorés et mesurés. Les grilles métier les plus
riches restent denses et demandent encore une appréciation en usage réel ; la
recette iPhone et les actions serveur empêchent d'annoncer honnêtement 9,6/10
pour l'expérience complète. La note est un jugement de design, pas un résultat
automatique déduit du nombre de tests.

Publication : PR de revue, sans merge ni mise en ligne automatique.

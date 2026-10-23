# Chiffrage — reprise visuelle du 23 octobre 2026

Cette intervention prolonge la livraison #45 depuis `f43d800d6de0864ca725447815a07c3700dbf54a`.
Elle conserve le moteur, les catalogues et les snapshots. Le GO de reprise comprend la publication après validation.

## Exigences et état constaté

| Exigence | État et preuve |
| --- | --- |
| Continuer l’existant | Même application, même moteur ; aucun remplacement ni changement du schéma. |
| Logo Prime authentique | Fichier existant `prime-logo-negative.svg`, proportions conservées. Reconstitution en texte supprimée. |
| Typographie de synthèse | En-têtes de tableaux à 14 px en casse normale ; l’héritage global des petites capitales est neutralisé dans le chiffrage. |
| Nombres et CHF alignés | Tableaux communs, colonnes partagées, nombres tabulaires. Sur Natel : intitulé complet puis deux colonnes de montants par poste. |
| Licences denses | Cas QA de 44 modules, environ 59 px par ligne desktop. Annuel et jours accessibles ; tarifs non confirmés dans un détail. |
| Prime et partenaires compacts | Résumé par ligne avec investissement et annuel ; formulaire dépliable, code interne masqué côté client. |
| Comparaison de 2–3 variantes | Trois cartes financières dans la largeur desktop ; adaptation Natel, référence modifiable, écarts globaux, groupes de différences et choix identiques repliés. |
| Variantes au même titre | Numérotation des choix, révision affichée, champ de titre accessible sur chaque onglet ; pas de renommage automatique d’une ancienne offre. |
| Respect des anciennes offres | Résultat du snapshot utilisé en priorité pour comparer ; recalcul uniquement en l’absence de résultat, avec son catalogue versionné. |
| Versions/bases différentes | Avertissement spécifique ; tri canonique des clés pour éviter un faux écart de version. |
| Commune et canton | Nom/population conservés ; emblèmes cantonaux existants, séparés du blason communal. |
| Carte de Suisse | Chemins d’assets corrigés pour GitHub Pages source et build Vite ; identifiants OFS numériques ou texte acceptés ; cadrage Suisse issu des données existantes. |
| Blasons communaux | Six fichiers locaux vérifiés par OFS (P771) et blason (P94), avec provenance Commons dans `coats.js`. Recherche vérifiée pour les autres communes ; absence et panne explicitement traitées. |
| Valeurs humaines et préremplissages | Moteur, règles et contrats existants conservés ; jours modifiés signalés, saisie et sauvegarde exercées dans le harnais. |
| Retour sur l’effet du prix | Totaux actualisés ; indication transitoire de la variation de l’investissement et de l’annuel. |
| Chiffrage incomplet | État conservé, valeurs inconnues distinctes de zéro ; accès aux modules dont les jours manquent. Comparaison sans delta conclusif pour une variante incomplète. |
| SQL / hébergement / LCM / collaborateurs | Calculs et corrections de #45 conservés, couverts par les tests existants. Aucune règle tarifaire ajoutée. |
| Clair, sombre, FR et DE | 144 contrôles de mise en page sur les six onglets du chiffrage, deux apparences, deux langues et six largeurs. |
| Prix d’achat et confidentialité | Accès interne conservé. Aucun catalogue, coefficient privé ou document commercial ajouté au dépôt. |
| Sauvegarde / reprise / variantes | Parcours navigateur du harnais : jours et titre personnalisés, ligne partenaire modifiée, sauvegarde/relecture, changement de référence et passage de 3 à 2 variantes. |

## Validation

- `npm run check` : 122 tests réussis (116 existants et 6 tests de contrats de présentation).
- `npm run build` : réussi ; avertissements CSS `@theme` / `@tailwind` déjà présents dans la base.
- Six tailles : 360×780, 430×932, 768×1024, 1366×768, 1920×1080, 2560×1440.
- Matrice source statique, comparable au mode GitHub Pages : 144 contrôles, sans débordement horizontal global ni erreur JavaScript.
- Contrôle ciblé de montants à six chiffres (988’888 CHF d’investissement et 188’888 CHF annuels ajoutés à une ligne) sur 360, 430 et 1366 px ; libellés annuels compacts sur Natel.
- Inspection visuelle de l’offre desktop/Natel, des licences chargées et de la comparaison ; correction d’un écrasement des intitulés financiers sur Natel et d’un conflit de cascade responsive découvert pendant la recette.
- Vérifications fonctionnelles sur les jours personnalisés, leur indicateur, les titres, les lignes partenaires, la sauvegarde, la relecture et la référence de comparaison.
- Le moteur `calculate.js`, ses règles de configuration et ses standards ne sont pas modifiés ; les fonctions serveur et les données métier ne sont pas modifiées.

## Limites à conserver explicitement

Les captures et le harnais utilisent des prix, volumes et offres fictifs. Le nom et le blason de Saignelégier sont réels ; les chiffres affichés ne décrivent pas une offre client réelle.

Aucune session authentifiée donnant accès aux catalogues privés n’était disponible pour cette intervention. Le rapprochement des offres privées avec Excel, l’export réel et le parcours de bout en bout en production restent donc à confirmer ; les tests existants et la préservation du moteur ne remplacent pas cette vérification.

Les blasons locaux couvrent Saignelégier, Lausanne, Fribourg, Haute-Sorne, Tolochenaz et Bex. Pour les autres communes, la disponibilité dépend de la source Wikimedia ; aucun blason n’est inventé et un emblème cantonal ne remplace jamais un blason communal.

## Captures de contrôle — données fictives

- [Offre desktop](qa/chiffrage-20261023/offre-desktop.png)
- [Licences chargées](qa/chiffrage-20261023/licences-desktop.png)
- [Comparaison de trois variantes](qa/chiffrage-20261023/comparaison-desktop.png)
- [Offre Natel](qa/chiffrage-20261023/offre-natel.png)
- [Résultats de la matrice](qa/chiffrage-20261023/matrix.json)

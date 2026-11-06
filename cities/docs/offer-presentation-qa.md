# Offre client — rythme et finition

Recette du 6 novembre 2026, depuis `114f2880ccb0602a1192a671679a76489352cd41`.

## Diagnostic

`offre.html` charge `styles/main.css` (fondations, composants, offre, vue Chiffrage,
responsive, skins), puis `client-offer.css`. Le HTML provient de `client-offer.js`
et des fonctions pures de `offer/presentation.js`, aussi utilisées par l'éditeur.
Le périmètre est la présentation : aucun changement des calculs, du schéma,
des données, du transport, des liens ou du générateur PDF.

Avant : les options ajoutaient une marge de 32 px au gap du conteneur (26 px sur
Natel), soit 58 px. Les logiciels avaient un gap de 10 px sur Natel, les services
14 px, et leur séparation ajoutait 18 px. Les variantes responsive du corps
étaient répétées ; les marqueurs et focus avaient plusieurs propriétaires.

## Contrat durable

Échelle : 4 / 8 / 12 / 16 / 24 / 32 / 48 px, avec alias sémantiques dans
`offer.css`. La gouttière extérieure reste fluide pour conserver la composition
Prime. Les dimensions des marques et la voie des marqueurs sont des exceptions
optiques, documentées ; elles ne définissent pas les espacements de rubrique.

| Relation | Règle | Propriétaire |
| --- | ---: | --- |
| Éléments liés / lignes de modules | 8 px | gap du conteneur |
| Titre de carte → contenu | 12 px | marge du titre |
| Titre principal de rubrique → contenu | 16 px | marge du titre |
| Bord intérieur de carte | 16 px Natel / 24 px dès 661 px | padding de carte |
| Cartes de même niveau | 16 px | gap de grille |
| Logiciels → services associés | 16 px | marge de la grille de services, un seul propriétaire |
| Grandes rubriques, dont les options | 32 px | gap du corps, marge des options à zéro |
| Sous-rubriques financières | 24 px | gap de la pile financière |

Les logos partagent une zone optique de 40 px ; aucune hauteur commune n'est
imposée aux cartes. Les listes se replient toujours par défaut. Les options
restent hors des totaux. Les chiffres de l'investissement et de l'annuel sont
alignés par sous-grille ; le total cinq ans est visuellement secondaire.
Tous les dérouleurs utilisent un triangle plein orange et une cible de 44 px
minimum. Le focus partagé est orange, 2 px, décalé de 3 px. L'accent textuel est
assombri dans l'aperçu Helvetia pour rester lisible sur fond clair.

## Mesures dans Chrome

Fixtures locales uniquement : Ballaigues comme référence visuelle (identité,
montants et périmètre présents dans les captures fournies), complétée par des
prestations et quatre options synthétiques. Le HTML public est produit par le
véritable point d'entrée avec une réponse figée, sans appel aux publications.
L'aperçu est une fixture des composants partagés avec les classes internes,
en Helvetia ; ce n'est pas une connexion à l'éditeur authentifié.

| Largeur du document embarqué | Padding carte | Gap cartes | Logiciels → services | LCM → options | Écart des bords droits financiers | Débordement |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 360 | 16 | 16 | 16 | 32 | 0 | aucun |
| 430 | 16 | 16 | 16 | 32 | 0 | aucun |
| 768 | 24 | 16 | 16 | 32 | 0 | aucun |
| 1366 | 24 | 16 | 16 | 32 | 0 | aucun |
| 1920 | 24 | 16 | 16 | 32 | 0 | aucun |
| 2560 | 24 | 16 | 16 | 32 | 0 | aucun |

Valeurs en px. Même résultat FR/DE, rubriques ouvertes/repliées, public et
composants internes : 48 cas. Cible minimale observée : 44 px. À 1366 px,
les deux montants principaux commencent à la même ordonnée (écart 0 px),
avec une taille de 44 px ; le total cinq ans est à 35,2 px.

Inspection visuelle de l'en-tête, carte, signature repliée/dépliée, montants,
répartition annuelle, logiciels et groupes, hébergement, LCM, options ouvertes
et fermées, prestations, détail financier et pied de page. Texte allemand long
et prestation sur deux lignes vérifiés à 360 px. Navigation clavier : focus
orange de 2 px / offset 3 px effectivement observé sur le premier groupe.

`npm run check` : 219 tests réussis. `npm run build` : réussi.
Le test de génération PDF et de confidentialité fait partie de cette suite.
Le véritable gestionnaire du bouton public a également atteint « PDF prêt. »
avec une réponse PDF locale ; aucun compteur client n'a été incrémenté.

## Appréciation et limites

Appréciation visuelle : **9,5/10 dans le navigateur vérifié**. Le rythme est
désormais explicite, les colonnes stables et les variantes regroupées dans
leurs propriétaires. Les captures avant/après documentent notamment la fin
du cumul de 58 px avant les options. Cette note reste une appréciation de
finition ; les mesures ci-dessus sont les preuves reproductibles.

Pas d'essai sur iPhone physique ni de validation Safari dans cette recette.
Les largeurs sont celles de vrais documents embarqués dans Chrome, pas une
simulation de Safari. Le parcours authentifié interne et le téléchargement
PDF sur iOS restent à vérifier sur appareil. Aucune offre existante modifiée.

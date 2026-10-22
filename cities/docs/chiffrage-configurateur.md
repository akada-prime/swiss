# Configurateur Prime · livraison coordonnée

Le configurateur utilise le même `calculateQuote` dans le navigateur et dans la
fonction Edge. La vue ne calcule aucun tarif parallèle. Les données commerciales
restent exclusivement dans le catalogue privé authentifié.

## Parcours livré

- Projet : commune, volumes suggérés, logiciels/ERP, énergie, hébergement et LCM.
- Licences : standard présélectionné, obligation distincte, jours du module et
  options supplémentaires. Les jours facturés au niveau d'un lot sont indiqués.
- Prestations : reprises, formation, démarrage, GP immédiatement accessibles ;
  compléments par ERP, interfaces, technique et prix journalier.
- Synthèse : vente et décomposition client. Synthèse latérale sur ordinateur,
  barre compacte sur Natel, détail complet accessible directement.
- Interne : accès volontaire confirmé, bandeau de sortie, coûts et coefficients.
  Les champs internes ne sont pas construits dans la présentation client.
- Export client par défaut, selon une liste positive de champs. L'export interne
  complet reste disponible séparément. Aucun JSON complet dans l'export client.
- Enregistrement/révisions et lien authentifié de reprise sur ordinateur. Une
  modification non enregistrée interdit l'export d'une ancienne version par erreur.

## Références et compatibilité

`standards.js` clone les références du catalogue dans le chiffrage. Ni les
modifications ni les variantes ne changent le catalogue. Une réapplication
remplace uniquement les prestations et la GP après explication/confirmation.
Les licences, volumes et dérogations restent conservés.

Les licences et jours temporairement désactivés sont conservés dans le snapshot,
à l'écart du moteur, puis restaurés lorsqu'on réactive le choix. Les prestations
propres à un ERP sont conservées mais exclues si cet ERP n'est pas retenu.

La GP est opt-in pour les nouveaux snapshots : pourcentage, jours Prime comme
assiette, exclusions et arrondi provenant de la référence privée. Les anciennes
lignes fixes de GP restent identiques. Les prestations de partenaires et
l'hébergement ne sont pas ajoutés à cette assiette.

Un jour absent d'une source n'est pas remplacé par un faux zéro validé. Le
chiffrage avec une référence et des jours manquants est explicitement incomplet,
son investissement est signalé comme partiel et l'export final est refusé.
Un zéro saisi volontairement reste une valeur valide.

## Préparation privée reproductible

- `scripts/chiffrage/prepare-references.py` lit les jours et formules des Excel,
  prépare des références nommées et exige une référence par défaut explicite.
  Les jours groupés Abacus sont facturés une seule fois, séparément des licences.
- `scripts/chiffrage/prepare-energy.py` vérifie le texte de la macro VBA sans
  l'exécuter. Il associe les trois modules énergie à la grille fournie, à son
  traitement pour une commune et aux règles d'arrondi explicitement retrouvées.
  Les autres modules non vérifiés restent manuels.
- Tous les fichiers d'entrée et de sortie doivent rester hors du checkout public.
  Ces scripts ne modifient aucune base et n'activent aucune version.

Les quatre Excel sont des références commerciales nommées, pas une nouvelle
loi population/jours. Certaines options Abacus n'ont pas de jours explicites.
L'hébergement retrouvé dans l'exemple retenu est limité à son périmètre ERP :
il ne constitue pas un nouveau tarif universel pour les autres combinaisons.

`prepare-release.mjs` prépare l'import inactif, l'activation atomique protégée
contre un changement des versions actives, et le retour aux versions précédentes.
Il réutilise le catalogue Abacus existant et ne supprime aucune version.

## Rapprochement Excel

Le contrôle privé de la référence commerciale complète retenue retrouve exactement
l'investissement, l'annuel et le TCO sur cinq ans, au centime. Il inclut les options
Prime présélectionnées, les prestations de partenaires à leur propre prix journalier,
Oracle, SQL, l'hébergement et les déplacements avec leur remise explicite.

Le contrôle a corrigé, dans une nouvelle version privée uniquement, la distinction
entre la base des finances ProConcept, l'allocation de son interface et la règle de
vente des salaires. Les jours personnalisés figurant dans le corps de l'Excel
priment sur la grille de jours standard du même fichier. Les versions antérieures
ne sont pas réécrites. `compare-reference.py` permet de répéter le rapprochement
avec les fichiers privés, à périmètre identique. Ce contrôle ne certifie pas les
combinaisons dont les valeurs manquent dans les sources.

## Publication

Le frontend, les modules partagés de la fonction Edge et le nouvel export doivent
être publiés ensemble. Déployer également `standards.js`, dépendance du moteur.
La fonction conserve son contrôle de session et son origine GitHub Pages.

Importer les nouveaux catalogues comme versions privées distinctes, vérifier leur
contenu, puis activer le jeu retenu atomiquement. Ne jamais réécrire les versions
référencées par les anciens chiffrages. Une reprise peut réactiver les anciennes
versions sans supprimer les nouvelles ni leurs snapshots.

`AGENTS.md` interdit le merge automatique et les modifications de données
Supabase : ces opérations restent distinctes de la livraison du code en branche.
Le développement et les vérifications se font sans écriture dans les données.

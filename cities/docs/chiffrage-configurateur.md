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
L'hébergement ProConcept provient de l'exemple Tolochenaz. Alex a confirmé le
23 octobre 2026 que l'hébergement Abacus reprend le même investissement et le
même annuel. Un second préréglage privé, limité au choix Abacus, reprend donc
les montants de cette référence ; le choix simultané des deux ERP ne crée qu'une
seule ligne. Les autres combinaisons sans ces ERP ne reçoivent aucun tarif
inventé. Les lignes déjà personnalisées conservent leurs montants.

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

La première version a été publiée le 22 octobre 2026 par le PR #41 :
`main` 8058b15, fonction Edge v9, références privées activées. La fonction
conserve son contrôle de session et son origine GitHub Pages.

Une session navigateur ouverte avant l'activation avait conservé l'ancien
catalogue et créé un chiffrage Bex avec ces versions. Chaque nouvelle création
relit désormais le catalogue actif. Une révision déjà enregistrée garde ses
versions ; l'action explicite « Créer la variante actuelle » charge les
références présentes, conserve les jours et prix saisis et prépare un nouveau
chiffrage sans toucher à l'original.

Importer les nouveaux catalogues comme versions privées distinctes, vérifier leur
contenu, puis activer le jeu retenu atomiquement. Ne jamais réécrire les versions
référencées par les anciens chiffrages. Une reprise peut réactiver les anciennes
versions sans supprimer les nouvelles ni leurs snapshots.

Les valeurs Abacus de Fribourg dans `ABA_Client` possèdent une colonne
monétaire supplémentaire avant les jours. Le préparateur reconnaît désormais
la colonne des jours de chaque édition du classeur et ne traite jamais la
valeur monétaire calculée comme une durée.

Le 23 octobre 2026, la version commerciale privée `innosolv-2027-configurateur-20261023-r3`
a ajouté le préréglage d'hébergement Abacus en reprenant à l'identique les
montants du préréglage ProConcept. Les autres paramètres et l'ancien préréglage
sont inchangés. Les anciens chiffrages restent figés sur leur version ; une
variante explicite permet d'appliquer la nouvelle référence sans écraser les
montants saisis manuellement.


## Lien client sécurisé — proposition figée

L'éditeur et la page client sont deux applications distinctes, pas deux niveaux
de visibilité d'un même composant.

- **Créer** depuis une offre enregistrée complète (`publishOffer`) produit un
  jeton 256 bits. Seule son empreinte SHA-256 est stockée. La publication référence
  l'UUID du chiffrage et sa révision, et reste immuable après toute mise à jour.
- **Lire** (`clientOffer`) est le seul endpoint accessible sans session éditeur :
  jeton dans l'en-tête Authorization, une seule projection contrôlée par liste
  positive en réponse. Pas de catalogues, pas de lignes du calcul, pas de coûts
  PA, pas de marges, pas de jours ni de référence tarifaire.
- La réponse ne contient que titre/identité de la commune, révision, produits
  retenus, investissement et récurrence de vente, total sur cinq ans et trois
  catégories **Solutions Prime / Partenaires / Hébergement**.
- Le lien `cities/offre.html#JETON` ouvre une page autonome sans navigation vers
  l'application et sans JS d'éditeur. Le fragment n'est pas transmis au serveur
  GitHub Pages. La page applique une CSP stricte, `noindex` et `no-referrer`.
- **Révoquer** (`revokeOffer`) et **Lister les liens** (`sharedOffers`) exigent
  la session éditeur. Un lien expire après 90 jours ; une révocation le rend
  immédiatement inutilisable.
- RLS sur `public.chiffrage_client_links`, aucun droit `anon` ou
  `authenticated`; seul le backend service_role accède à la table.
- Les opérations internes originelles (sauvegarde, restauration, export, reprise
  de session) gardent la protection actuelle et n'acceptent pas les jetons clients.
- Le client ne reçoit jamais le JSON complet pour qu'un filtre CSS puisse le
  masquer. C'est une exclusion au niveau de la donnée envoyée.

Avant toute communication externe : recette d'une offre **complète**,
revue du contenu visible côté client, vérification du comportement après
révocation et contrôle sur Safari mobile/PC. Ne pas communiquer le lien de
reprise interne.


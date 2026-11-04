# Référentiel global du chiffrage

Édition 2026-11-04.1. Consultation interne globale, indépendante de toute commune.

## Propriétaires

- `app/chiffrage/rules-reference.js` : articles métier, identifiants stables,
  chapitres, formules explicatives, origine, état et pointeurs de source.
- `app/chiffrage/rules-reference-view.js` : recherche accent-insensible,
  filtres, détails, paramètres associés et lecture des grilles du catalogue.
- `view.js` : accès depuis le header interne, chargement authentifié du
  catalogue actif dans `state.ruleCatalog`, retour au contexte initial.
- `styles/views/chiffrage.css` : registre en colonnes sur PC, lignes empilées
  sur Natel. Le contenu métier est rédigé en français, commandes FR/DE.

Le référentiel n'est pas un second moteur et n'enregistre aucune modification.
Il ne recalcule pas une offre. Son ouverture ne remplace ni `state.catalog` ni
le brouillon d'une offre historique. La déconnexion efface son catalogue.

## Trois lectures

1. Règles : articles généraux, présélections, calculs, exceptions et versions.
2. Paramètres actifs : lecture complète des paramètres privés du catalogue,
   dont profils, jours, GP, déplacements, options, hébergement et LCM.
3. Grilles par article : méthode, dimension, paliers, exceptions, sources et
   empreinte importée pour chaque article du catalogue actif.

Les valeurs commerciales ne sont jamais recopiées dans ce document, les
articles publics ou des fixtures. Le transport existant `catalog` reste
protégé côté serveur. Aucun changement de schéma, de droits, de calcul,
d'export client ou de lien client n'est nécessaire.

## Origine et état

- **Alex** : instruction explicite identifiée, avec date ou document source.
- **Code constaté** : comportement vérifié dans l'implémentation ; l'origine
  commerciale complète n'est pas déduite du seul fait qu'il fonctionne.
- **Catalogue source** : définition privée importée/versionnée.

**Confirmée** signifie qu'une instruction explicite soutient la règle ;
**À confirmer** signale la provenance ou la portée restant à rapprocher,
pas nécessairement une erreur. **À arbitrer** marque notamment une grille
non vérifiée nécessitant des montants manuels. **Prévue** désigne une
intention encore hors du fonctionnement actif.

Le registre ne prétend pas certifier l'intégralité de tous les anciens échanges.
L'inventaire initial rapproche le moteur, les importeurs, la documentation du
projet, le prompt Chiffrage révisé et les consignes ultérieures identifiées.
Les tarifs privés sont lus dans leur version active, pas repris d'un ancien
prompt. Aucun désaccord identifié ne doit déclencher une correction financière
sans arbitrage d'Alex.

## Tenue à jour

Toute modification de formule ou dépendance doit identifier les articles
concernés, mettre à jour leur explication/source/état et l'édition du registre.
Une évolution de paramètre ou de grille apparaît à la prochaine ouverture grâce
à la lecture du catalogue actif. L'historique financier reste celui des
révisions d'offres et de leurs versions tarifaires ; l'édition du dictionnaire
n'est pas un archivage exécutable des anciennes versions du moteur.

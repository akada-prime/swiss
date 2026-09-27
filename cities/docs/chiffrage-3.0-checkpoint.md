# Chiffrage 3.0 — checkpoint de branche

Branche : `feature/chiffrage-3.0`. La version affichée reste 2.5. La migration
`20260927200100_chiffrage_private_schema.sql` crée uniquement des tables,
index et fonctions de stockage et de limitation de connexion. Elle n'a pas
été appliquée à la base distante. Aucun tarif, coefficient commercial, annexe
ni export client ne doit être ajouté au dépôt public.

## Flux privé à valider avant une mise en service

1. Faire relire et approuver la migration. L'appliquer ensuite sur le projet
   Supabase attendu. Vérifier les droits `anon`, `authenticated` et
   `service_role` sur les tables et RPC. Aucun accès anonyme au catalogue.
2. Déployer la fonction Netlify `netlify/functions/chiffrage.mjs` depuis le
   répertoire `cities` ; vérifier que `/cities/api/chiffrage` atteint vraiment
   cette fonction sur le domaine cible. Configurer côté serveur seulement
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CHIFFRAGE_ACCESS_CODE` (la
   même valeur que l'éditeur communal) et `CHIFFRAGE_SESSION_SECRET` (long,
   aléatoire). Ne pas placer leurs valeurs dans le dépôt ni les variables
   publiques Vite. Vérifier le domaine `URL` utilisé par le contrôle d'origine.
3. Garder les 9 annexes et les JSON privés hors de Git. Le script
   `scripts/chiffrage/import-catalog.py` extrait des produits de trois Excel.
   Compléter séparément un JSON de paramètres privés/versionnés en suivant
   l'entrée exigée par `upload-private-catalog.mjs` et les règles du prompt.
   Les sources Abacus Avenches/Fribourg sont des références historiques :
   ne pas les activer comme tarif Abacus courant sans arbitrage métier.
4. Après validation, `node scripts/chiffrage/upload-private-catalog.mjs
   <catalogue-externe.json> <parametres-externes.json>` avec les deux variables
   Supabase serveur crée des versions **inactives**. Vérifier le nombre de
   lignes, sources, paramètres et conflits dans la base privée. Activer les
   versions innosolv, Abacus et commercial dans une transaction contrôlée,
   après désactivation des précédentes du même fournisseur. Une version
   tarifaire est toujours conservée si une révision la référence.
5. Tester sur le domaine réellement déployé la connexion, la lecture refusée
   sans session (y compris export), la limitation des essais, la création,
   une modification concurrente, la réouverture d'une ancienne révision et
   la validité des trois onglets Excel. Valider humainement les quatre cas
   commerciaux avant toute fusion ou changement du numéro 2.5.

## Points encore à compléter

- Une grille LCM **candidate** par blocs de 5 000 est désormais dérivée hors
  dépôt de la liste contractuelle retrouvée (18 contrats Gold et 8 Platinium
  comparables) et de l'offre Fribourg pour le Gold 40 000 habitants. Le script
  `scripts/chiffrage/derive-lcm.py` écarte les compléments, hébergements seuls,
  autres plans, GRD et instances mutualisées. Il conserve pour chaque palier la
  méthode, les références observées et le statut `draft_unapproved`. Les
  résultats au-dessus des communes comparables sont des estimations, pas des
  prix approuvés. L'outil d'import les refuse tant que la révision métier n'a
  pas été faite. Les montants et le fichier contractuel restent hors du dépôt.
- Les règles produits `Versorger` et `Kirche` et une divergence de grille
  Abacus sont signalées `unverified` et refusées par le calcul automatique.
  Les cinq sous-totaux de licences Abacus groupées sont rattachés à leurs
  identifiants de base, avec les composants inclus ; la validation des quatre
  offres reste nécessaire.
- Le tarif actuel Abacus n'est pas daté comme tarif officiel 2027 dans ces
  calculateurs historiques. La grille importée couvre désormais les colonnes
  explicites jusqu'à 40 000 habitants dans l'offre Fribourg. Au-delà, une
  extrapolation linéaire bornée par produit est signalée comme estimation.
  Dans Fribourg, la population `Gemeinde!L3` est 40 000, le sélecteur Abacus
  `ABA_Client!X5` vaut 30 000, et les deux colonnes 30 000 et 40 000
  utilisent le multiplicateur `V8` calculé à 40 000. Le calcul historique
  sélectionne donc la colonne 30 000, tandis que le nouveau calcul à 40 000
  sélectionnerait la colonne 40 000. Le catalogue conserve les deux valeurs
  source et signale le choix historique ; il ne le reproduit pas silencieusement
  pour un nouveau chiffrage. Il faut confirmer commercialement laquelle sert
  d'ancre à Fribourg. Le seuil SQL/core reste paramétrable.
- La migration, le stockage et les fonctions Netlify n'ont pas pu être
  vérifiés sur un environnement de test Supabase/Netlify. Le statut de
  sécurité en production et l'acceptation métier ne sont donc pas validés.

Les tests Git utilisent uniquement des données inventées. La reconstruction
locale de la formule PCE Haute-Sorne correspond aux quatre valeurs de contrôle
du calculateur, mais ce résultat isolé ne valide pas toute l'offre.

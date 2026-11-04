# Vitrine d'options client

« Pour aller plus loin » est distinct du périmètre retenu et replié par défaut.
Trois idées apparaissent après ouverture ; les suivantes, six au maximum, sont
sous un deuxième repli. Découvrir ne sélectionne rien et ne modifie aucun total.

## Préparation
Offre → Options à présenter au client. Choisir quelques options compatibles,
rédiger titre et bénéfice, ajouter un détail facultatif et ajuster les jours si
nécessaire. Réordonner ou retirer. Aucun choix automatique.
Les candidats proviennent des options innosolv à proposer, des articles Abacus
vérifiés, des options Prime actives et compatibles, et de Salaires PCE quand
Finances PCE est retenu. Les fonctions incluses ne sont jamais des candidats.
Un choix déjà retenu ou incompatible est masqué.

## Prix et publication
input.client_options stocke les clés, textes FR/DE et jours personnalisés.
Le moteur ignore ce champ. Chaque supplément est calculé sur une copie qui
ajoute uniquement cette option avec calculateQuote, tenant compte des effets
sur les postes existants, notamment GP et PCE. On ne cumule pas les options.
Un prix manquant n'est pas un faux zéro. Titre, bénéfice et prix sont exigés
avant partage. Les données sont normalisées côté serveur.
La publication utilise la révision et ses catalogues figés puis une liste
positive de textes et PV : aucun PA, coefficient, identifiant ou jour publié.
Les anciens liens restent figés. Aucun schéma ni tarif n'est changé.

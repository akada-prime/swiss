# Lecture des prestations et des marges — 24 octobre 2026

Les jours des lignes de licences ne suffisaient pas à connaître le total de
mise en œuvre : des forfaits de groupes sont stockés dans les prestations
transversales. Une licence à zéro jour pouvait donc masquer un forfait non nul.
Le résumé de Projet et Prestations agrège les deux familles, par solution,
puis présente les prestations communes. Les jours et PV sont lus dans les
lignes du résultat du moteur, sans recalcul tarifaire concurrent. Les valeurs
connues restent visibles si un élément de la solution est à compléter.

![Exemple fictif de prestations](qa/chiffrage-20261024-implementation/prestations.jpg)

L’onglet interne commence désormais par les marges logicielles déjà calculées
par le moteur : deuxième année, troisième année et suivantes, puis total sur
quatre annuités. Les valeurs sont présentées en CHF et en pourcentage du PV,
ce qui distingue la marge des coefficients PA/PV éditables placés ensuite.
Un PA inconnu empêche d’afficher une marge certaine. Les coûts de prestation
et les autres achats manquants sont explicités ; aucune marge globale nette
n’est fabriquée. Ces cartes disparaissent en mode client.

![Exemple fictif de marges](qa/chiffrage-20261024-implementation/marges.jpg)

Une référence de prestations supplémentaire issue d’une source fournie par
Alex a été ajoutée dans une nouvelle version protégée. Les taux et les autres
paramètres restent identiques, les articles sont conservés, le choix par défaut
reste unique et les anciennes versions restent accessibles aux offres
existantes. Les chiffres et le détail de l’audit de cette offre sont conservés
dans un rapport privé, sans les publier ici.

## Validation

- 160 tests passent, avec trois tests de présentation : forfaits par groupes
  comptés malgré les licences à zéro, coûts/jours inconnus explicites, marge
  exprimée en % du PV et horizon de quatre annuités.
- Build et `git diff --check` réussissent.
- 24 parcours à 360, 430, 768, 1366, 1920 et 2560 px, deux apparences, FR/DE :
  lecture des forfaits, mise à jour après modification des jours, accès interne,
  trois marges visibles et disparition en mode client. Aucun débordement ni
  erreur JavaScript.
- 12 cas complémentaires de résumé partiel : les jours connus restent affichés,
  le caractère incomplet est visible et la ligne ne déborde pas sur Natel.
- Ajout de référence : application contrôlée hors ligne par le moteur partagé,
  contrôle SQL de conservation des autres paramètres, des articles, des taux et
  du choix par défaut. Aucun chiffrage existant réécrit, aucune migration.
- [Parcours](qa/chiffrage-20261024-implementation/checks.json) et
  [cas partiels](qa/chiffrage-20261024-implementation/partial-checks.json).

Les captures de cette recette utilisent exclusivement des données fictives.
Les mesures de marge sont des présentations de résultats existants : aucun
moteur ni formule de marge n’a été modifié.

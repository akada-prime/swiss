# Prime Communes · Roadmap validée

Validation produit : 7 septembre 2026.

## Vision

Prime Communes passe d'une base qui sait **qui utilise quoi** à un observatoire
qui explique **ce qui bouge, pourquoi cela compte et ce que l'histoire d'une
commune raconte de notre métier**.

Le produit ne devient ni un CRM complet, ni une GED. Les actions commerciales
restent légères et les documents restent dans leurs systèmes d'origine ; Prime
Communes conserve uniquement les faits, leurs liens, leur provenance et leur
interprétation.

## 1.0 — Rassembler · terminé

- 2'110 communes et référentiel OFS / Delimo P99.
- Population, marchés linguistiques, cantons et districts.
- Premières données d'intégrateurs et de logiciels.
- Recherche, filtres, export et interface Natel.

## 1.1 — Savoir · terminé et stabilisé

- Carte suisse interactive fondée sur les surfaces officielles 2026.
- Statistiques en communes ou habitants ; Romandie strictement francophone,
  cantons, Jura bernois et seuils de 5'000 / 10'000 habitants.
- Client Prime distinct de l'intégrateur.
- Modèle séparant métier, ERP et modules, avec catalogue multi-produits.
- Fiches communales : données OFS verrouillées, écosystème éditable.
- Recherche, filtres synchronisés, tri et export TSV.
- Liens partageables conservant l'onglet, les filtres et le tri.
- Vue minimale par défaut ; ERP, modules et hébergeur via **Logiciels**.
- Responsive ordinateur / Natel et contrat de non-régression.
- Stabilisation de la base Delivery, permissions resserrées et point de
  restauration GitHub.

La 1.1 décrit l'état courant. Elle n'historise pas encore les changements.

## 2.0 — NEWS! · Faire parler les communes

### 2.0.1 — Radar communal · première version en cours

- Nouvel onglet **NEWS!**.
- Flux de signaux forts, éléments à surveiller et informations de marché.
- Recherche par commune, canton, sujet ou source.
- Filtres par niveau de signal.
- Date, commune/OFS, raison d'intérêt, provenance et confiance visibles.
- Accès direct depuis un signal à la fiche communale.
- Première alimentation éditoriale versionnée.
- À terme, croisement des données Prime avec le Web, les médias, les budgets,
  procès-verbaux, offres d'emploi, décisions et publications publiques.

### 2.0.2 — Une commune, une histoire

- Identité locale, histoire et faits distinctifs de la commune.
- Lien humain, territorial ou historique avec Prime.
- Histoire commune avec Prime : étapes, projets et héritage transmis aux autres
  collectivités.
- Plusieurs angles éditoriaux proposés à partir de faits sourcés.
- Déclinaisons possibles pour la fiche, LinkedIn, une offre ou une présentation.
- Validation humaine obligatoire : aucun récit ni rapprochement inventé.

Le récit Avenches — Aventicum, Haras national, Franches-Montagnes, Le Noirmont
et Prime — constitue le modèle éditorial de référence.

### 2.0.3 — Actualités interprétées

- Expliquer ce qu'une actualité change plutôt que recopier un lien.
- Identifier les communes, produits, intégrateurs et territoires concernés.
- Distinguer explicitement fait, déduction et lecture Prime.
- Faire naître une histoire depuis un événement, ou éclairer un signal grâce à
  l'histoire institutionnelle d'une région.

### 2.0.4 — Qualification légère et forecast

L'ancien point **Leads et forecast** est conservé mais replacé dans le contexte
du Radar, sans recréer un CRM :

- responsable ;
- prochaine action ;
- probabilité ;
- échéance ;
- valeur estimée ;
- lien vers les signaux et faits qui justifient la qualification.

Estimation historique conservée : 14–28 h · 35–80 crédits.

### Extensions fonctionnelles 2.x

- Briefing « Prépare-moi cette commune ».
- Jumeau communal et références comparables.
- Graphe des relations intercommunales.
- Effet domino d'un gain ou d'une migration.
- « Pourquoi je regarde cette commune ? ».
- Histoires et statistiques Prime prêtes à raconter.

## 2.5 — Comprendre le temps · fondations techniques

### Infrastructure Prime

Déplacer l'application et la base stabilisées vers les serveurs Prime, séparer
frontend, configuration et secrets, puis figer l'architecture cible avec un
point de restauration 1.1.

### Authentification · SSO · rôles · RLS

Comptes professionnels et accès nominatifs `TeamVente`, `Direction` et `Admin`.
Estimation historique conservée : 16–30 h · 40–90 crédits.

### Audit trail et temporalité métier

- Savoir qui a créé, modifié, validé ou supprimé une information.
- Valeurs précédentes, périodes de validité et retour à une date.
- Audit redéfini avec les utilisateurs et les droits nominatifs.
- Le trigger historique reste désactivé jusqu'à cette phase.

Estimation historique conservée : 8–16 h · 20–45 crédits.

### Provenance, confiance et contradictions

- Source primaire, URL ou référence interne.
- Date de publication, détection et dernière vérification.
- Confiance : confirmée, probable ou à vérifier.
- Contradictions visibles entre données Prime et sources publiques.
- Séparation stricte entre fait, déduction et avis.

### Collecte et intelligence Web

- Collecte des budgets, décisions, PV, appels d'offres, recrutements et sites
  communaux.
- Veille des intégrateurs, éditeurs et logiciels.
- Détection, dédoublonnage, rapprochement OFS et file de validation humaine.
- Les documents restent dans leur source : Prime Communes n'est pas une GED.

Les anciens points 3.0 « Opportunités marché », « Mise à jour web et PV » et
« Veille intégrateurs et logiciels » sont conservés ici comme moteur technique
du Radar visible en 2.0.

### Historique Delimo

Photographies successives, population, fusions et qualité des livraisons.
Estimation historique conservée : 12–26 h · 30–70 crédits.

### Mouvements de marché

Gains, pertes, migrations et changements de fournisseurs avec provenance et
dates.

### Carte et statistiques temporelles

Comparer deux dates avec le moteur de filtres commun à la carte et aux
statistiques.

### Données financières sécurisées

PA, PV, LCM, marge, récurrence et historique tarifaire dans un modèle dédié,
visible uniquement selon les droits. Ces données ne deviennent pas des colonnes
improvisées du profil communal.

Estimation historique conservée : 16–36 h · 40–100 crédits.

### API interne et qualité

- API interne stable pour les consommateurs autorisés.
- Cohérence OFS, complétude, doublons et contrôles automatisés.
- Modèle multi-produits et installations multi-périodes avec provenance.

## 3.0 — Anticiper · copilote

- Recherche en langage naturel « Demande à la Suisse ».
- Préparation automatique d'un briefing communal sourcé.
- Jumeaux communaux et recommandations de références.
- Simulateur d'effet domino et de scénarios de marché.
- Détection et rédaction assistée d'histoires, avec validation humaine.
- Simulateur de séisme : éditeur, technologie, fusion ou changement légal.

## Règles permanentes

- Pas de CRM complet et pas de GED.
- Les faits sensibles respectent les rôles et les droits.
- Aucune donnée Web ou IA n'est présentée comme certaine sans source.
- Les périmètres romands restent strictement francophones.
- Métier, ERP et modules restent trois notions distinctes.
- Abacus est un ERP revendu par Prime, jamais un module par défaut.
- Clever.Tax reste un module à Marly, édité par KMS.
- Toute migration Supabase est présentée et validée avant exécution.

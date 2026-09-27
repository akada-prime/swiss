# Prime Communes · Roadmap validée

Validation produit : 27 septembre 2026.

## Vision

Prime Communes évolue d'un référentiel qui sait **qui utilise quoi** vers un outil
qui permet de **comprendre le marché communal, qualifier les signaux utiles et
transformer une commune en chiffrage ERP défendable**.

Le produit ne devient ni un CRM complet, ni une GED, ni un générateur d'offre
contractuelle. Les documents restent dans leurs systèmes d'origine ; Prime
Communes conserve les faits, leurs liens, leur provenance et les éléments
nécessaires au chiffrage. La décision commerciale reste humaine et les calculs
financiers doivent rester déterministes, explicables et auditables.

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

La 1.1 décrit le socle de données stabilisé. Elle n'historise pas encore les changements.

## 1.5 — Mettre en perspective · terminé

- Carte et statistiques ont transformé le référentiel en lecture exploitable du marché.
- Périmètres Suisse, Romandie, cantons, districts et marchés linguistiques.
- Vue minimale par défaut, avec deux lectures complémentaires à la demande :
  **Territoire** pour la langue et le district ; **Systèmes** pour l'écosystème IT.
- Carte Natel centrée sur la Suisse romande tout en conservant le contexte suisse.
- Liens partageables, filtres et export cohérents avec ces deux niveaux de lecture.

Cette étape fonctionnelle est distincte de l'ancienne phase technique 1.5, dont
tous les éléments restent conservés en 2.5.

## 2.0 — Radar! · Faire parler les communes · terminé

### 2.0.1 — Radar communal · première version livrée, enrichissement actif

- Onglet **Radar!**.
- Flux de signaux forts, éléments à surveiller et informations de marché.
- Recherche par commune, canton, sujet ou source.
- Filtres par niveau de signal.
- Date, commune/OFS, raison d'intérêt, provenance et confiance visibles.
- Accès direct depuis un signal à la fiche communale.
- Première alimentation éditoriale versionnée.
- À terme, croisement des données Prime avec le Web, les médias, les budgets,
  procès-verbaux, offres d'emploi, décisions et publications publiques.

### 2.0.2 — Une commune, une histoire · première version livrée

- Identité locale, histoire et faits distinctifs de la commune.
- Lien humain, territorial ou historique avec Prime.
- Histoire commune avec Prime : étapes, projets et héritage transmis aux autres
  collectivités.
- Plusieurs angles éditoriaux proposés à partir de faits sourcés.
- Déclinaisons possibles pour la fiche, LinkedIn, une offre ou une présentation.
- Validation humaine obligatoire : aucun récit ni rapprochement inventé.

Le récit Avenches — Aventicum, Haras national, Franches-Montagnes, Le Noirmont
et Prime — constitue le modèle éditorial de référence.

Première livraison :

- récit affiché directement dans **Radar!**, sous le Radar communal ;
- chronologie fondée sur les sources officielles du Site et Musée romains
  d'Avenches et d'Agroscope ;
- fait Prime, sources publiques et lecture d'Axel visuellement séparés ;
- trois angles éditoriaux sélectionnables et copiables ;
- accès à la fiche communale d'Avenches et interface Natel dédiée.

### 2.0.3 — Actualités interprétées · première version livrée

- Expliquer ce qu'une actualité change plutôt que recopier un lien.
- Identifier les communes, produits, intégrateurs et territoires concernés.
- Distinguer explicitement fait, déduction et lecture Prime.
- Faire naître une histoire depuis un événement, ou éclairer un signal grâce à
  l'histoire institutionnelle d'une région.

Première livraison :

- bouton **Comprendre l'impact** sur chaque signal documenté ;
- ligne de preuve séparant fait public, déduction documentée et lecture Prime ;
- identification explicite des communes, territoires, produits et intégrateurs
  concernés, y compris lorsqu'un lien n'est pas établi ;
- recherche étendue aux interprétations, sans modifier le fait public source.

### 2.0.4 — Qualification légère et forecast · première version livrée

L'ancien point **Leads et forecast** est conservé mais replacé dans le contexte
du Radar, sans recréer un CRM :

- responsable ;
- prochaine action ;
- probabilité ;
- échéance ;
- valeur estimée ;
- lien vers les signaux et faits qui justifient la qualification.

Première livraison :

- bouton **Qualifier ce signal** directement relié à chaque actualité ;
- décision, responsable, prochaine action, échéance, probabilité et valeur ;
- cockpit calculant le forecast brut et pondéré ;
- brouillons conservés uniquement dans le navigateur utilisé ;
- aucune création de lead, écriture Supabase ou donnée métier validée ; la
  persistance centrale, les droits et l'audit restent en 2.5.

Estimation historique conservée : 14–28 h · 35–80 crédits.

### 2.0.5 — Portrait communal · livré

- Un clic sur une commune, dans la liste ou la recherche Natel, ouvre son
  portrait public ; la modification reste une action explicite dans ce portrait.
- Les faits déjà présents dans Prime Communes sont affichés immédiatement.
- Le résumé et l'illustration Wikipédia ne sont chargés qu'à l'ouverture.
- Le canton et le district servent à écarter les pages homonymes ou ambiguës.
- La source, le lien vers l'article et la licence CC BY-SA restent visibles.
- Sans article sûr, le portrait conserve les faits locaux et indique clairement
  que le résumé Wikipédia est indisponible.
- Aucun modèle d'IA ni nouvelle écriture de données n'est utilisé.

### Extensions fonctionnelles 2.x

- Briefing « Prépare-moi cette commune ».
- Jumeau communal et références comparables.
- Graphe des relations intercommunales.
- Effet domino d'un gain ou d'une migration.
- « Pourquoi je regarde cette commune ? ».
- Histoires et statistiques Prime prêtes à raconter.

## 2.5 — Socle consolidé · terminé

La 2.5 clôt la phase de reconstruction et de maturation du produit actuel.
Elle constitue le socle stable sur lequel sera construite la 3.0.

### Rebuild et stabilité

- Rebuild structurel intégré et stabilisé.
- Fondations CSS, composants, vues et responsive consolidés.
- Navigation et état applicatif fiabilisés après déploiement.
- Carte WebGL2 et six vues principales revalidées.
- Correction du bug runtime React post-déploiement.
- Contrat de non-régression conservé pour ordinateur et Natel.

### Recherche, navigation et édition

- Recherche dédiée qui filtre la liste sans ouvrir automatiquement une fiche.
- Conservation des filtres et du contexte après sauvegarde.
- Fermeture d'une fiche avec retour à la liste filtrée.
- Enregistrement explicite : en cours, succès, reprise après modification et
  conservation des saisies en cas d'échec.
- Hébergeur modifiable dans la fiche communale.
- Regroupement des informations métier, ERP, modules, hébergeur et notes.
- Navigation par le grand logo Prime vers l'accueil avec réinitialisation globale.
- Séparation visuelle plus claire entre filtres et informations affichées.

### Apparence, préférences et langues

- Apparence **Prime Dark**.
- Apparence **Helvetia Hell**.
- Mode **Automatique** suivant le thème clair/sombre du système.
- Préférences utilisateur conservées côté navigateur.
- Français et allemand suisse intégrés comme préférences d'interface.
- Paramètres séparés des futures fonctions d'administration.

### Radar et lecture du marché

- **NEWS!** devient **Radar!**.
- Veille communale, signaux, interprétations et portrait communal conservés.
- Séparation stricte entre fait public, déduction et lecture Prime.
- Les éléments de qualification légère existants restent disponibles sans
  transformer Prime Communes en CRM.

### Mode d'intervention adaptative

Prime Communes conserve une validation proportionnée au risque de chaque
modification : diff minimal, pas de refactoring opportuniste et contrôles
uniquement lorsqu'ils apportent une preuve utile.

Document de référence :
[`docs/adaptive-intervention-mode.md`](./docs/adaptive-intervention-mode.md).

Principe directeur : déterministe d'abord ; raisonnement lourd seulement
lorsqu'il apporte une information nouvelle ou réduit réellement le risque.

## 3.0 — Chiffrage · à réaliser

La 3.0 introduit un nouveau cœur métier : partir d'une commune connue et produire
rapidement un **chiffrage ERP complet, explicable et défendable**.

Le résultat n'est pas l'offre contractuelle finale. Il sert à établir le coût
du projet et ses coûts récurrents afin de disposer d'une base solide pour une
présentation au Conseil, à l'Assemblée, à une commission ou à toute autre
instance communale. L'offre Word/PDF à signer reste hors de Prime Communes.

### Entrée et périmètre

- Nouvel onglet **Chiffrage**.
- Création depuis une commune de Prime Communes ou depuis l'onglet Chiffrage.
- Reprise automatique des données communales utiles déjà connues : OFS, canton,
  population et contexte système lorsque disponible.
- Usage 3.0 limité aux **communes**.
- Le modèle de données ne doit pas empêcher une extension future à d'autres
  entités, mais aucune interface de chiffrage PME, fondation ou GRD autonome
  n'est prévue dans cette version.

### Solutions et modules

- **innosolv** : sélection des modules, valeur logiciel, prestations et coûts
  récurrents selon le moteur innosolv.
- **Abacus** : sélection explicite des modules utiles à la commune ; règles
  standard et règles RH distinctes lorsque nécessaire.
- **ProConcept ERP** : périmètre volontairement simple, limité à
  **Finances** et **Salaires**, dérivé de la base innosolv selon les règles Prime.
- Les modules peuvent embarquer leurs propres prestations de mise en œuvre.

### Prestations projet

Prestations transversales séparées des modules :

- reprise de données ;
- gestion de projet ;
- formation ;
- aide au démarrage ;
- autres prestations globales explicitement justifiées.

Chaque prestation doit pouvoir exposer quantité, unité, prix, règle source et
éventuel ajustement manuel.

### Technique et bases de données

- innosolv implique **Microsoft SQL Server**.
- ProConcept ERP implique **Oracle**.
- Abacus ne génère pas de coût de base de données dans le chiffrage.
- Oracle apparaît uniquement lorsque ProConcept est sélectionné.
- Le moteur Oracle gère notamment les utilisateurs **Full** et **Light** ainsi
  que leurs règles de licence et de maintenance.
- Les règles exactes de prix restent paramétrables et ne doivent pas être
  dispersées dans le code.

### Hébergement et écosystème

- Hébergement oui/non et montant associé.
- GED, eAdmin et autres prestations ou solutions tierces peuvent être intégrées
  au chiffrage.
- Les éléments tiers peuvent contribuer au TCO et au rôle de SPOC commercial
  sans être artificiellement assimilés à une marge logiciel Prime.

### LCM

- Choix limité pour les nouveaux chiffrages à **Aucun**, **Gold** ou
  **Platinium**.
- Proposition de référence par blocs de population de 5'000 habitants.
- Le prix calculé reste visible comme référence.
- Le prix retenu peut être ajusté manuellement.
- Les anciens Bronze, Silver, Gold+ et compléments historiques ne servent pas
  de modèle pour les nouveaux chiffrages.

### Marges et règles commerciales

- Marge identifiable clairement par famille : innosolv, ProConcept, Abacus et
  autres familles pertinentes.
- innosolv et Abacus standard utilisent un modèle de rent annuel basé sur une
  valeur logiciel avec PA et PV distincts.
- Les règles propres à ProConcept et aux modules RH Abacus sont modélisées
  séparément.
- Toute règle doit être explicable et centralisée.
- Toute valeur commerciale importante peut être ajustée manuellement sans
  perdre la valeur théorique d'origine.

### Résumé et export

Le chiffrage doit produire au minimum :

- investissement initial ;
- coûts annuels ;
- TCO ;
- ventilation par solution et grandes familles ;
- marges pertinentes ;
- principales hypothèses et ajustements manuels.

Export Excel prévu avec :

- un onglet **Résumé** ;
- un onglet **Détail** avec les lignes de calcul et leurs sources.

### Hors périmètre 3.0

- Pas de génération de l'offre Word/PDF contractuelle finale.
- Pas de scoring ou simulation AOP.
- Pas de CRM complet.
- Pas de chiffrage PME, fondation ou GRD autonome.
- Pas d'IA nécessaire au calcul ou à la détermination du prix.
- Pas de décision automatique à la place de l'utilisateur.

Le moteur de prix 3.0 doit fonctionner sur la base de
**données + règles + paramètres + choix utilisateur = résultat**.

## Backlog transversal — non versionné

Ces sujets restent utiles mais ne définissent plus une version produit tant
qu'ils ne sont pas replanifiés explicitement :

- infrastructure Prime et séparation frontend / configuration / secrets ;
- authentification, SSO, rôles et RLS ;
- audit trail et temporalité métier ;
- provenance, confiance et contradictions ;
- collecte Web industrialisée et moteur technique du Radar ;
- historique Delimo, fusions et photographies successives ;
- mouvements de marché et statistiques temporelles ;
- modèle sécurisé des données financières ;
- API interne et contrôles de qualité.

## Brainstorming futur — Intelligence commerciale / IA · non planifié

L'ancien **3.0 — Anticiper · copilote** est déplacé ici. Ces idées restent
volontairement hors engagement de version.

### Copilote communal

- Recherche en langage naturel **Demande à la Suisse**.
- Préparation automatique d'un briefing communal sourcé.
- Jumeaux communaux et recommandations de références.
- Simulateur d'effet domino et de scénarios de marché.
- Détection et rédaction assistée d'histoires, avec validation humaine.
- Simulateur de séisme : éditeur, technologie, fusion ou changement légal.

### Copilote de chiffrage

L'IA peut à terme accélérer fortement la préparation sans devenir la source du
prix :

- proposer les modules probablement pertinents à partir du contexte communal ;
- préremplir certaines hypothèses ;
- identifier les informations encore manquantes ;
- signaler les incohérences de configuration ;
- détecter une prestation probablement oubliée ;
- expliquer un calcul ou un écart ;
- préparer un chiffrage en langage naturel à partir des moteurs déterministes ;
- comparer une configuration aux pratiques historiques Prime lorsque les
  données sont suffisamment fiables.

Principe permanent : **l'IA assiste et orchestre ; les règles calculent**.

## Règles permanentes

- Pas de CRM complet et pas de GED.
- Les faits sensibles respectent les rôles et les droits.
- Aucune donnée Web ou IA n'est présentée comme certaine sans source.
- Les périmètres romands restent strictement francophones.
- Métier, ERP et modules restent trois notions distinctes.
- Abacus est un ERP revendu par Prime, jamais un module par défaut.
- Clever.Tax reste un module à Marly, édité par KMS.
- Toute migration Supabase est présentée et validée avant exécution.

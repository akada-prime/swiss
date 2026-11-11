// Global read-only rule dictionary. Generic formulas only; real values come from the authenticated catalog.
// Editorial business text is authored in French; UI controls support FR/DE.
export const referenceVersion = '2026-11-11.1';
export const ruleArticles = [
  {id:'L-ESS',chapter:'Licences éditeurs',title:'Abonnement facturé directement par l’éditeur',summary:'Le budget inclut l’abonnement, avec une facturation distincte de Prime.',formula:'Utilisateurs proposés = moitié des collaborateurs, arrondie au supérieur. Annuel = utilisateurs × prix mensuel privé × 12. PA = PV ; aucune remise de première année ni marge Prime sur cet abonnement.',code:'Décision Alex · 11.11.2026 ; calculate.js / monthly_per_user',origin:'alex',status:'confirmed',note:'Les tarifs sont versionnés dans le catalogue privé. Les anciens dossiers ne sont pas recalculés automatiquement.'},
  {
    "id": "G01",
    "chapter": "Principes",
    "title": "Un référentiel commun",
    "summary": "Les règles décrivent le calculateur, indépendamment des communes et des offres.",
    "formula": "Un dictionnaire global ; les hypothèses et ajustements de chaque offre restent dans cette offre.",
    "code": "Décisions Alex · 04.11.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "G02",
    "chapter": "Principes",
    "title": "Origine et autorité",
    "summary": "Une règle codée ne devient pas automatiquement une règle métier validée.",
    "formula": "Consigne explicite → formule Excel → tarif éditeur → PDF de contrôle. En cas de contradiction : Alex arbitre avant correction.",
    "code": "Prompt Chiffrage §1 ; décisions Alex · 04.11.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "G03",
    "chapter": "Principes",
    "title": "Tarifs privés et versionnés",
    "summary": "Les prix et coefficients viennent du catalogue protégé.",
    "formula": "Aucun tarif commercial réel dans les sources publiques. La lecture du catalogue exige la session interne.",
    "code": "Prompt Chiffrage §2–3 ; server.mjs / loadCatalog",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "G04",
    "chapter": "Principes",
    "title": "Calculé, retenu, écart",
    "summary": "Un ajustement manuel conserve la valeur théorique.",
    "formula": "Valeur retenue = ajustement si renseigné, sinon calcul. Écart = retenu − calculé. Zéro est un ajustement valide.",
    "code": "calculate.js / effective ; prompt §24",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "G05",
    "chapter": "Principes",
    "title": "Arrondis : distinguer les modes",
    "summary": "Un arrondi au plus proche diffère d'un arrondi supérieur.",
    "formula": "Arrondi monétaire au plus proche : floor(valeur / pas + 0,5) × pas. Les quantités, la population licenciée et certaines options Prime utilisent au contraire ceil(valeur / pas) × pas. Le pas doit être strictement positif.",
    "code": "calculate.js / roundTo, priceCatalogItem, primeAnnual, calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "D01",
    "chapter": "Dimensions et suggestions",
    "title": "Population licenciée",
    "summary": "Proposition arrondie au prochain multiple de 500.",
    "formula": "ceil(max(0, habitants) / 500) × 500. La base retenue doit être un entier au moins égal à la population. Les anciennes offres sans base explicite gardent leur population historique.",
    "code": "calculate.js / licensedPopulation, calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "D02",
    "chapter": "Dimensions et suggestions",
    "title": "Compteurs et taxes proposés",
    "summary": "Un tiers de la population, arrondi à 500 au-dessus.",
    "formula": "ceil(max(0, habitants) / 3 / 500) × 500. Suggestion modifiable, utilisée séparément pour les taxes et les compteurs.",
    "code": "configuration.js / suggestedVolume ; prompt §6",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "D03",
    "chapter": "Dimensions et suggestions",
    "title": "Employés proposés",
    "summary": "Suggestion par tranches, modifiable.",
    "formula": "Moins de 1'000 : 10 ; moins de 2'000 : 20 ; moins de 3'000 : 25 ; moins de 4'000 : 30. Au-delà : min(100, floor(habitants / 1'000) × 10).",
    "code": "configuration.js / suggestedEmployees",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "D04",
    "chapter": "Dimensions et suggestions",
    "title": "Population modifiée",
    "summary": "Actualiser une suggestion sans remplacer une valeur différente.",
    "formula": "Compteurs, taxes, population licenciée et employés sont recalculés seulement si leur valeur égale encore la suggestion de la population précédente. Une saisie manuelle égale à cette suggestion reste indiscernable d'un défaut.",
    "code": "configuration.js / updatePopulation",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "S01",
    "chapter": "Sélection et dépendances",
    "title": "Standard ne signifie pas obligatoire",
    "summary": "Les modules de base sont précochés et restent modifiables.",
    "formula": "Le profil choisi fournit les modules par défaut ; à défaut, default_selected du catalogue. 129VD est rapproché de 129 pour les profils.",
    "code": "standards.js / defaultModule ; prompt §8",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "S02",
    "chapter": "Sélection et dépendances",
    "title": "Variante vaudoise",
    "summary": "VD utilise 129VD pour la plateforme cantonale.",
    "formula": "La sélection du code générique 129 est résolue vers 129VD dans le canton VD, sans changer les autres cantons.",
    "code": "calculate.js / selectInnosolvItem, calculateQuote ; prompt §10",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "S03",
    "chapter": "Sélection et dépendances",
    "title": "Gestion des compteurs",
    "summary": "Le choix énergie ajoute ou retire le groupe de trois articles.",
    "formula": "501, 502 et 533 doivent exister au catalogue Versorger ; activation possible seulement avec innosolv. La désactivation retire aussi les prestations correspondantes.",
    "code": "configuration.js / setEnergy",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "S04",
    "chapter": "Sélection et dépendances",
    "title": "Produits et prestations conditionnelles",
    "summary": "Une prestation ne compte que si ses conditions sont remplies.",
    "formula": "Tous les produits requis, le préfixe de module éventuel et l'option PCE requise doivent être présents. Les options désactivées ou incompatibles sont exclues.",
    "code": "standards.js / serviceApplies ; module-catalog.js / optionApplies",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "S05",
    "chapter": "Sélection et dépendances",
    "title": "Retirer puis remettre un module",
    "summary": "Restaurer les valeurs commerciales et jours déjà ajustés.",
    "formula": "Les choix retirés sont conservés hors des entrées du moteur ; ils retrouvent leur module et leur prestation à la réactivation.",
    "code": "standards.js / retainRemoved",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "S06",
    "chapter": "Sélection et dépendances",
    "title": "Fonctions incluses",
    "summary": "Une fonction incluse suit son parent sans supplément.",
    "formula": "Les fonctions actives sont rattachées à un parent du catalogue et ordonnées. Elles ne créent ni licence ni jour supplémentaires. Les options Prime indépendantes restent facturables séparément.",
    "code": "module-catalog.js / includedForParent ; décisions Alex · fonctions incluses PCE",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "S07",
    "chapter": "Sélection et dépendances",
    "title": "Aperçu des options",
    "summary": "Voir le prix avant le choix ne l'ajoute pas au total.",
    "formula": "L'aperçu travaille sur une copie. Une option non choisie est exclue des totaux ; les valeurs manquantes restent à préciser et zéro reste zéro.",
    "code": "business-presentation.js / optionPreview ; consigne Alex · 28.10.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "S08",
    "chapter": "Sélection et dépendances",
    "title": "Options proposées au client",
    "summary": "Une vitrine choisie par Prime, repliée et hors des totaux.",
    "formula": "Au plus six options compatibles non retenues ; trois vignettes mises en avant. Titre et bénéfice renseignés, jours et prix connus avant partage. Chaque supplément est la différence calculée par le moteur en ajoutant uniquement cette option sur une copie du chiffrage. Les totaux restent inchangés. Les fonctions incluses ne sont pas des options à monnayer.",
    "code": "offer-options.js ; client-projection.mjs ; décision Alex · 04.11.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": "La vitrine est consultative. Le choix interactif du client et son circuit de validation restent distincts."
  },
  {
    "id": "L01",
    "chapter": "Licences éditeurs",
    "title": "Dimension et palier",
    "summary": "Chaque article conserve sa propre base de calcul et sa grille.",
    "formula": "La quantité peut être arrondie au-dessus, puis soumise au minimum de l'article. Exception zero_is_free : une quantité source nulle produit zéro. Le premier palier dont la borne couvre la quantité est retenu.",
    "code": "calculate.js / priceCatalogItem",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "L02",
    "chapter": "Licences éditeurs",
    "title": "Trois méthodes tarifaires",
    "summary": "Respecter la méthode de la source au lieu d'interpoler partout.",
    "formula": "lookup : valeur du palier. linear_rounded : interpolation entre deux ancres puis arrondi. rounded_ratio : ratio du palier × valeur de référence puis arrondi. Un multiplicateur source éventuel s'applique avant l'arrondi final.",
    "code": "calculate.js / priceCatalogItem ; prompt §9",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "L03",
    "chapter": "Licences éditeurs",
    "title": "Hors grille et prix non vérifiés",
    "summary": "Ne pas inventer de tarif automatique.",
    "formula": "Sous la première ancre : maintien seulement si explicitement permis. Au-delà : estimation linéaire seulement si autorisée, avec deux ancres et un plafond. Un article unverified exige PA et PV manuels. Sinon, calcul refusé.",
    "code": "calculate.js / priceCatalogItem, calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "L04",
    "chapter": "Licences éditeurs",
    "title": "Rent annuel PA / PV",
    "summary": "La valeur logiciel et les taux commerciaux sont distincts.",
    "formula": "PA annuel = valeur logiciel × taux PA ; PV annuel = valeur logiciel × taux PV. Taux par éditeur et classe de tarif. Les dérogations globales concernent la classe standard, sans remplacer les classes spécifiques.",
    "code": "calculate.js / calculatePublisherRent, calculateQuote ; prompt §11–12",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "L05",
    "chapter": "Licences éditeurs",
    "title": "Identifiants et provenance",
    "summary": "Conserver l'identifiant licence et la source de chaque grille.",
    "formula": "SW-ID innosolv et ID Abacus sont des données métier. Le numéro de ligne Excel ne les remplace pas. Le détail des articles ci-dessous affiche la version, la source et la règle importée.",
    "code": "Prompt Chiffrage §9,12,25 ; import-catalog.py",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "L06",
    "chapter": "Licences éditeurs",
    "title": "Énergie : minimum et réduction communale",
    "summary": "La grille compteurs comporte des règles propres aux articles.",
    "formula": "Les articles 501 et 502 appliquent le minimum et le multiplicateur communal vérifiés dans la source VBA. 533 ne reçoit pas automatiquement ces deux mêmes paramètres. Quantité arrondie, cas zéro et arrondi monétaire restent définis par article.",
    "code": "scripts/chiffrage/prepare-energy.py ; grilles privées Versorger",
    "origin": "code",
    "status": "review",
    "note": "Les valeurs exactes figurent dans les grilles par article ; aucune macro Excel n'est exécutée par le site."
  },
  {
    "id": "P01",
    "chapter": "ProConcept",
    "title": "Base Finances",
    "summary": "Le calcul actif dépend de la méthode du catalogue.",
    "formula": "Méthode innosolv_plus_options : base = PA annuel innosolv + PA des articles hors liste de base PCE. Autre méthode : PA innosolv + ajustement fixe. Résultat intermédiaire = arrondi(base × ratio). Les options peuvent donc contribuer à la base globale puis au complément.",
    "code": "calculate.js / calculatePce, calculateQuote ; prepare-references.py",
    "origin": "code",
    "status": "review",
    "note": "Ne pas remplacer la formule active par celle d'un ancien calculateur. Les valeurs de méthode et la liste des articles de base figurent dans les paramètres actifs."
  },
  {
    "id": "P02",
    "chapter": "ProConcept",
    "title": "Finances, interface et PV",
    "summary": "Sortir l'interface du montant Finances sans la compter deux fois.",
    "formula": "PA Finances = intermédiaire arrondi − allocation interface. PV Finances = arrondi(intermédiaire / (1 − marge)) − allocation interface. L'allocation utilisée dépend de la méthode active ; elle n'est pas déduite de l'override PA Finances.",
    "code": "calculate.js / calculatePce ; prepare-references.py",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "P03",
    "chapter": "ProConcept",
    "title": "Salaires : PA puis PV",
    "summary": "Le PV Salaires peut utiliser une majoration ou une marge.",
    "formula": "PA Salaires = arrondi(intermédiaire Finances / 2). Si salary_pv_method = markup : PV = arrondi(PA × (1 + taux)). Sinon PV = arrondi(PA / (1 − taux)). Un PA manuel ne recalcule pas automatiquement le PV théorique.",
    "code": "calculate.js / calculatePce",
    "origin": "code",
    "status": "review",
    "note": "Majoration sur PA et marge sur PV sont deux formules différentes. Le référentiel montre le mode du catalogue actif."
  },
  {
    "id": "P04",
    "chapter": "ProConcept",
    "title": "Interface séparée et PCE autonome",
    "summary": "La combinaison avec innosolv détermine la ligne d'intégration.",
    "formula": "En méthode innosolv_plus_options, PCE + innosolv ajoute une ligne Interface avec PA nul et PV paramétré. Sans innosolv, chaque option PCE choisie exige un PV manuel ; son PA reste inconnu sans saisie explicite. Oracle suit la sélection PCE.",
    "code": "calculate.js / calculateQuote ; consigne Alex · 25.10.2026",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "T01",
    "chapter": "Bases de données",
    "title": "Utilisateurs SQL suggérés",
    "summary": "Interpolation entre deux repères de population.",
    "formula": "Arrondi à l'entier le plus proche de utilisateursBas + (habitants − populationBasse) / (populationHaute − populationBasse) × (utilisateursHauts − utilisateursBas), minimum zéro. La formule peut aussi extrapoler hors des deux repères.",
    "code": "calculate.js / suggestedSqlUsers ; prompt §15",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "T02",
    "chapter": "Bases de données",
    "title": "Deux régimes SQL",
    "summary": "Sous le seuil : utilisateurs ; au seuil et au-dessus : cores.",
    "formula": "Si habitants < seuil : forfait de base + utilisateurs × prix utilisateur. Sinon : cores × prix core. Prix core absent sans montant manuel : investissement inconnu, à compléter. SQL est calculé quand innosolv est retenu.",
    "code": "calculate.js / calculateSql, calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "T03",
    "chapter": "Bases de données",
    "title": "Oracle Full / Light",
    "summary": "Acquisition et maintenance suivent les deux quantités.",
    "formula": "Investissement = Full × prix Full + Light × prix Light. Annuel = Full × maintenance Full + Light × maintenance Light. Ajustements investissement et annuel indépendants ; PA saisis séparément. Oracle seulement avec PCE.",
    "code": "calculate.js / calculateOracle, calculateQuote ; prompt §14",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "J01",
    "chapter": "Prestations et profils",
    "title": "Jours de référence",
    "summary": "Un profil fournit des jours de départ, sans modèle population → jours.",
    "formula": "Jours module = valeur du profil, sinon standard. Repli possible Versorger → Gemeinde et 129VD → 129. Une absence reste inconnue. Le chantier du multiplicateur démographique n'est pas actif.",
    "code": "standards.js / serviceDays ; décisions Alex · 22.10 et 04.11.2026",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "J02",
    "chapter": "Prestations et profils",
    "title": "Appliquer un profil",
    "summary": "Remplacer les jours et prestations de référence est une action explicite.",
    "formula": "L'application remplace les prestations transversales, GP, déplacements et jours des modules. Les licences, volumes et prix personnalisés restent conservés. Les lignes Prime/partenaires du profil sont ajoutées seulement en initialisation.",
    "code": "standards.js / applyReference ; view.js / data-reference",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "J03",
    "chapter": "Prestations et profils",
    "title": "Valorisation des prestations",
    "summary": "Les jours retenus priment sur la suggestion.",
    "formula": "Investissement unitaire = jours × tarif propre à la ligne (sinon tarif jour commun) + licence initiale fixe éventuelle. Ajustement investissement prioritaire ; quantité appliquée ensuite. Sans jours, utilisation du forfait saisi s'il existe.",
    "code": "calculate.js / calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "J04",
    "chapter": "Prestations et profils",
    "title": "Forfaits Abacus",
    "summary": "Ne pas compter les jours du paquet pour chaque option.",
    "formula": "L'import des références rattache une prestation globale au préfixe du paquet Abacus et donne zéro jour aux articles membres couverts par ce forfait. Une cellule source vide n'est pas convertie en zéro.",
    "code": "scripts/chiffrage/prepare-references.py / ABA_Client",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "J05",
    "chapter": "Prestations et profils",
    "title": "Gestion de projet en pourcentage",
    "summary": "Appliquer le pourcentage à une assiette de jours explicite.",
    "formula": "Assiette : prestations_module, prestations et lignes marquées gp_included ; hors ligne projet et codes exclus. Quantités comprises. Jours GP = arrondi(assiette × pourcentage / 100, pas de jours). PV = jours GP × tarif jour commun.",
    "code": "calculate.js / calculateQuote / projectManagement",
    "origin": "code",
    "status": "review",
    "note": "La règle en pourcentage est activée par le profil. Les anciennes offres à ligne fixe conservent leur fonctionnement."
  },
  {
    "id": "J06",
    "chapter": "Prestations et profils",
    "title": "Déplacements (estimés)",
    "summary": "Estimation sur les jours du projet, GP et partenaires compris.",
    "formula": "Montant = arrondi(somme des jours × quantités × pourcentage / 100 × tarif déplacement, pas monétaire). Si offerts : contre-ligne de même montant négatif. La règle automatique remplace l'ancienne ligne fixe lorsqu'elle est activée.",
    "code": "calculate.js / calculateQuote / travel",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "J07",
    "chapter": "Prestations et profils",
    "title": "Fribourg et les moyennes",
    "summary": "Fribourg ne doit pas influencer les suggestions moyennes de licences et jours.",
    "formula": "Directive du 25.10.2026 : utiliser des offres comparables hors Fribourg pour les moyennes. Un profil Fribourg peut rester une référence explicite ; sa présence ne signifie pas qu'il participe à une moyenne. Le moteur courant applique des profils, pas une moyenne automatique des offres.",
    "code": "Consigne Alex · 25.10.2026 ; standards.js / serviceDays",
    "origin": "alex",
    "status": "review",
    "note": "La conformité des échantillons ayant servi aux valeurs privées doit être rapprochée des sources de préparation ; ne pas conclure à partir du seul nom d'un profil."
  },
  {
    "id": "O01",
    "chapter": "Prime et partenaires",
    "title": "Tarification annuelle Prime",
    "summary": "Montant fixe ou formule selon la définition de l'option.",
    "formula": "annual_rule : population réelle × coefficient, arrondi au plus proche ; annual_override prioritaire. annual_pricing : population licenciée × coefficient, minimum, puis arrondi supérieur. Ces deux modèles historiques coexistent et ne sont pas interchangeables.",
    "code": "calculate.js / primeAnnual, calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "O02",
    "chapter": "Prime et partenaires",
    "title": "Mandats intégrés",
    "summary": "Un mandat intégré suppose au moins autant de mandats Finances.",
    "formula": "Quantité intégrée ≤ quantité Finances. L'annuel unitaire intégré est repris de la règle du mandat Finances. Sans mandat parent ou avec trop d'intégrés : calcul refusé.",
    "code": "calculate.js / calculateQuote",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "O03",
    "chapter": "Prime et partenaires",
    "title": "Quantités et données absentes",
    "summary": "Ne pas confondre un coût inconnu et un coût nul.",
    "formula": "Quantités Prime/partenaires entières et non négatives. PA absent conservé null ; PV nul conservé zéro. Des données indispensables manquantes rendent le chiffrage incomplet et empêchent le partage finalisé.",
    "code": "calculate.js / calculateQuote ; consigne Alex · 28.10.2026",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "O04",
    "chapter": "Prime et partenaires",
    "title": "Support Prime historique",
    "summary": "Ventiler le support ne doit pas augmenter l'annuel total.",
    "formula": "Le support Prime déjà présent est retiré au prorata du PV innosolv ; la dernière ligne absorbe le solde exact. Refus si le support est négatif ou supérieur à l'annuel innosolv.",
    "code": "calculate.js / calculateQuote / primeSupport",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "H01",
    "chapter": "LCM et hébergement",
    "title": "Classes LCM",
    "summary": "La borne haute d'une classe est incluse.",
    "formula": "Premier palier trié tel que habitants ≤ borne. Gold et Platinum ont chacun leur référence et ajustement. Une valeur de classe absente exige une saisie ; aucun tarif n'est fabriqué par le moteur.",
    "code": "calculate.js / calculateLcm",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "H02",
    "chapter": "LCM et hébergement",
    "title": "Formule LCM retenue",
    "summary": "Platinum remplace Gold ; les deux ne s'additionnent pas.",
    "formula": "Une seule sélection : aucune, Gold ou Platinum. Impact sur cinq ans = annuel retenu × 4. Le total avec LCM et le total hors LCM sont calculés séparément.",
    "code": "calculate.js / calculateQuote ; décision Alex · 27.10.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": "Le prompt initial prévoyait uniquement des options hors TCO ; les consignes et la présentation ont évolué vers une formule retenue. Les anciennes offres ne sont pas réécrites."
  },
  {
    "id": "H03",
    "chapter": "LCM et hébergement",
    "title": "Références LCM et estimations",
    "summary": "Identifier la méthode, la source et la taille d'échantillon.",
    "formula": "La préparation des références distingue observations, ajustements et estimations ; le moteur consomme la table versionnée. Les preuves Gold/Platinum de chaque classe sont consultables dans les paramètres actifs.",
    "code": "scripts/chiffrage/derive-lcm.py ; calculate.js / calculateLcm",
    "origin": "code",
    "status": "review",
    "note": "Les grilles manquantes, anciennes méthodes et validations commerciales ne doivent pas être confondues."
  },
  {
    "id": "H04",
    "chapter": "LCM et hébergement",
    "title": "Hébergement et périmètre",
    "summary": "Un forfait existant prime sur une proposition de référence.",
    "formula": "Les lignes d'hébergement personnalisées, y compris à zéro, sont conservées. Sinon premier preset compatible avec les produits. Si le périmètre change : confirmation explicite avant utilisation. Investissement et annuel doivent être renseignés si hébergement inclus.",
    "code": "standards.js / applyHosting ; configuration.js / hostingIncluded ; calculate.js",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "H05",
    "chapter": "LCM et hébergement",
    "title": "Référence hébergement Abacus",
    "summary": "Même investissement et annuel que la référence hébergement PCE.",
    "formula": "Décision du 23.10.2026 : le preset Abacus reprend les montants de la référence PCE. Le choix simultané des deux ERP ne doit pas doubler l'hébergement. Les lignes personnalisées priment.",
    "code": "docs/chiffrage-configurateur.md / Références et compatibilité",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "F01",
    "chapter": "Calendrier et marges",
    "title": "Calendrier client et TCO",
    "summary": "Investissement en année 1, quatre annuités en années 2 à 5.",
    "formula": "Investissement = somme des PV initiaux. Annuel = somme des PV annuels retenus. TCO 5 ans = investissement + 4 × annuel ; hors LCM, retrait de la formule LCM retenue avant multiplication.",
    "code": "calculate.js / calculateQuote ; prompt §21",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "F02",
    "chapter": "Calendrier et marges",
    "title": "PA éditeurs en année 2",
    "summary": "Demi-PA annuel innosolv et Abacus ; autres coûts sans cette réduction.",
    "formula": "Coûts connus sur cinq ans = PA initiaux connus + 4 × PA annuels connus − 0,5 × PA annuel innosolv/Abacus. PCE ne bénéficie pas de cette demi-année.",
    "code": "calculate.js / calculateQuote ; prompt §21",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "F03",
    "chapter": "Calendrier et marges",
    "title": "Marges calculées, coûts connus",
    "summary": "Les indicateurs actuels ne constituent pas une marge nette complète.",
    "formula": "Marge année 2 = PV annuel − PA annuel connu + demi-PA éditeurs. Année 3+ = PV annuel − PA annuel connu. Logiciels 5 ans = 4 × (PV − PA) logiciel + demi-PA éditeurs. Coûts inconnus signalés ; pas de coût interne jour inventé.",
    "code": "calculate.js / calculateQuote ; prompt §17,19,21",
    "origin": "code",
    "status": "review",
    "note": "La convention de marge nette et le coût interne de production appartiennent au chantier marges, encore à définir."
  },
  {
    "id": "V01",
    "chapter": "Versions et restitution",
    "title": "Révisions historiques",
    "summary": "Une nouvelle version tarifaire ne recalcule pas les anciennes offres.",
    "formula": "Chaque sauvegarde garde les versions de catalogue, les entrées et le résultat. Passer au standard actuel crée explicitement une variante. Restaurer une révision conserve une trace dans l'historique.",
    "code": "server.mjs / writeQuote ; view.js / upgrade, restore ; prompt §4,26",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "V02",
    "chapter": "Versions et restitution",
    "title": "Lien client",
    "summary": "Publier une révision finalisée et filtrée pour le client.",
    "formula": "Seuls périmètre, textes et PV autorisés sont projetés. Aucun PA, marge ou paramètre interne dans le lien client. Le référentiel reste dans l'accès interne du chiffrage.",
    "code": "supabase/functions/chiffrage/client-projection.mjs ; view.js / publishOffer",
    "origin": "code",
    "status": "review",
    "note": ""
  },
  {
    "id": "V03",
    "chapter": "Versions et restitution",
    "title": "Présentation et calcul",
    "summary": "Classer les lignes ne change pas leur montant.",
    "formula": "Chapitres, fonctions incluses, désignations et ventilation sont des projections. Les montants restent issus des lignes calculées. Déplacements est présenté comme « Déplacements (estimés) ».",
    "code": "module-classification.js ; commercial-breakdown.js ; décisions Alex · 04.11.2026",
    "origin": "alex",
    "status": "confirmed",
    "note": ""
  },
  {
    "id": "V04",
    "chapter": "Versions et restitution",
    "title": "Comparaison commerciale future",
    "summary": "Comparer seulement les PV licences et prestations.",
    "formula": "PA, LCM et hébergement exclus de cette comparaison. L'analyse historique de correspondance reste un chantier à venir ; aucune note automatique n'est active au titre de cette règle.",
    "code": "Décisions Alex · roadmap du 04.11.2026",
    "origin": "alex",
    "status": "planned",
    "note": ""
  },
  {
    "id": "V05",
    "chapter": "Versions et restitution",
    "title": "Configuration client future",
    "summary": "Montrer les options peut précéder leur modification par le client.",
    "formula": "La vitrine d'options et le configurateur interactif sont distincts. Le circuit de validation des changements client reste à définir ; il ne constitue pas une règle de calcul active.",
    "code": "Décisions Alex · roadmap du 04.11.2026",
    "origin": "alex",
    "status": "planned",
    "note": ""
  }
];

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchingRules(rows, {query='',chapter='',status=''}={}) {
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  return rows.filter(row=>(!chapter || row.chapter===chapter) && (!status || row.status===status) &&
    terms.every(term=>normalize([row.id,row.chapter,row.title,row.summary,row.formula,row.code,row.note,row.search].join(' ')).includes(term)));
}
export function catalogRules(catalog) {
  return (catalog?.items ?? []).map(item=>({
    id:`article:${item.vendor}/${item.product}/${item.item_code}`,chapter:'Articles du catalogue',
    title:`${item.vendor} · ${item.item_code} · ${item.label_fr || item.label_de || ''}`,
    summary:`${item.pricing_rule?.basis ?? '—'} · ${item.pricing_rule?.kind ?? '—'}`,
    formula:'La grille et les paramètres de cet article sont lus dans le catalogue actif, sans copie de prix dans le référentiel.',
    code:item.source || 'Source non renseignée', origin:'catalog',
    status:item.pricing_rule?.kind==='unverified' ? 'arbitrate' : 'review', item,
    search:JSON.stringify([item.pricing_rule,item.source_grid_note,item.conflict_sources])
  }));
}

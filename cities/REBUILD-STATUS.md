# État de reprise — Prime Communes 2.0

> **Options commerciales Prime · 06.11.2026 :** 0 jour était déjà valide ;
> l'interface registre foncier était bloquée par un prix annuel absent du catalogue.
> Ajout d'un prix annuel PV personnalisé dans les options à présenter, limité aux
> produits Prime, enregistré dans client_options.annual_override. 0 CHF est explicite,
> une valeur vide reprend le tarif de référence ; le catalogue général reste intact.
> Le calcul accepte aussi les tarifs Prime annual_pricing sans prix fixe. Les prix
> éditeur innosolv/Abacus/PCE ne deviennent pas modifiables par ce champ.
> Message de complétude ciblé : titre, bénéfice, jours ou prix annuel manquant ;
> aucune injonction à ressaisir des jours valables ni répétition du même message.
> 12 tests ciblés passent, build réussi ; suite complète vérifiée par la CI de ce lot.
> Recette synthétique des saisies 0/0, 0/500 et retour au tarif de référence ;
> six largeurs 360–2560 sans débordement. Aucun chiffrage réel ni tarif de référence
> modifié. Les publications existantes restent figées ; enregistrer et publier
> une nouvelle révision pour transmettre un prix personnalisé au client.

> **Gestion des publications · 05.11.2026 :** retrait du bouton Fermer redondant ;
> bouton Supprimer explicite par publication, classe de bouton danger partagée,
> confirmation native identique au reste du chiffrage. Suppression limitée au lien
> demandé et à son chiffrage parent ; les révisions et le chiffrage restent intacts.
> Actif/Inactif reste la suspension réversible. Aucun lien réel supprimé en recette.
> Edge v27 déployé ; session d'éditeur et contrôle d'origine conservés, accès DELETE
> réservé au serveur. 214 tests et build passent ; six largeurs sans débordement,
> bouton lisible de 96 px, annulation et suppression sur données synthétiques vérifiées.
> Diagnostic des options : zéro client_options dans les huit offres actives et zéro
> optional_options publié. La vitrine existe ; configurer Offre > Options à présenter
> au client, enregistrer et publier une nouvelle révision. Aucune option commerciale
> ni aucun montant ajoutés automatiquement aux offres existantes.

> **Cohérence de la liste et du partage · 04.11.2026 :** une seule grille financière :
> le montant cinq ans commence sous l'annuel. Métadonnées alignées sur le titre.
> Suppression du bouton Partager des cartes ; un seul dérouleur natif « Lien »
> à triangle orange contient toutes les commandes et explications. Partage client /
> Fermer sur la même ligne, adresse et Copier/Ouvrir sur toute la largeur ;
> rafraîchissement placé à côté des ouvertures. Une révision non publiée peut être
> publiée depuis le dérouleur, seulement si ses montants sont finalisés.
> Actif/Inactif met à jour le bouton en place : panneau, historique et focus conservés,
> y compris en cas d'échec. Le rafraîchissement conserve aussi l'historique ouvert.
> Hauteur financière réservée pendant le chargement pour éviter les sauts de cible.
> Aucun serveur, tarif ou contenu d'offre modifié. Contrôles fonctionnels synthétiques,
> 213 tests et build ; recette responsive 360–2560 px avant publication.

> **Partage et liste des chiffrages · 04.11.2026 :** GO utilisateur pour compacter
> les cartes et uniformiser les quatre actions. Investissement/annuel prioritaires,
> total cinq ans secondaire, Partager/Liens côte à côte. Un seul panneau refermable.
> Publication idempotente par chiffrage/révision ; adresse lisible sous la forme
> `offre.html#commune-canton/v1.0r5`, sans suffixe aléatoire. Variante distincte de la
> même commune : incrément du mineur v1.1, v1.2 ; révision conservée en rN.
> Activation/désactivation manuelle réversible ; aucune expiration automatique.
> Migration `20261104222332_named_client_publications.sql` appliquée : 7 publications
> nommées, 5 actives, 0 expiration ; états révoqués, compteurs et contenus figés
> conservés. Fonctions RPC accessibles seulement au rôle serveur. Risque d'adresse
> devinable expliqué et accepté par l'utilisateur avant ce lot.
> PDF A4 issu exclusivement de la publication publique figée, tous modules présents,
> options séparées et hors totaux. Logo Prime, pagination et en-têtes financiers
> répétés ; téléchargement depuis le haut et le bas de la page client. Le PDF ne
> gonfle pas les ouvertures web. Une erreur réseau est distinguée d'un lien désactivé.
> Serveur Edge v26 actif avec pdf-lib 1.17.1. Contrôles : 212 tests, check/build,
> six largeurs 360/430/768/1366/1920/2560 sans débordement et quatre boutons égaux,
> cycle ouvrir/fermer et activation réversible sur données synthétiques, PDF trois
> pages rendu et contrôlé. PDF Ballaigues récupéré en production (HTTP 200, application/pdf, nom de fichier lisible), sans incrément du compteur ; déclenchement vérifié dans Chrome ; l'événement de
> téléchargement du navigateur distant n'a pas remonté, pas de recette iOS physique.
> Aucun prix ni règle de calcul modifiés. PR #105 fusionnée en 24aa7b4 ; CI 843 puis 844 réussies.
> Déploiement Pages 41927450128 terminé avec succès.

> **Radar · qualification du lot de 200 candidats · 29.10.2026 :** cinq candidats
> analysés regroupés en trois nouveaux signaux communaux : Lausanne Abacus
> (45018-01, offres 02.11 à 11 h 30), Lausanne ressources projet/Business Analysis
> (45005-01, offres 02.11 à 16 h), Yverdon recherche documentaire/accessibilité
> (réponse municipale du 28.05.2026, pp. 1–2 ; COGE et postulat regroupés).
> Statuts commerciaux inconnus explicités ; aucune exclusion au seul motif client.
> 195 candidats écartés avec motif : archives, bruit, hors périmètre communal ou
> métier, adjudications confirmées, procédure interrompue ou calendrier non actualisé.
> Les marchés cantonaux (dont M-Files RCJU et guichet virtuel SITel FR) sont identifiés
> comme tels dans les candidats, sans rattachement artificiel à une commune.
> Sources SIMAP primaires consultées par projet ; réponse Yverdon scannée vérifiée
> visuellement. Aucun scan général, appel IA automatique, changement de code,
> de calcul ou de données Supabase. Cinq signaux antérieurs conservés.
> Contrôles : JSON, correspondance des 200 URL, statuts terminaux, cohérence
> signaux/analyses, 18 tests Radar ciblés. Date figée du test adaptée au nouveau lot.
> Publication sur main explicitement autorisée par l’utilisateur le 29.10.2026 ;
> seuls les fichiers de qualification Radar, le test daté et ce statut sont intégrés.

> **Radar → ChatGPT · 29.10.2026 :** ancien lien vers une conversation privée
> supprimé. Demande copiée, nouvel onglet réservé pendant le clic puis ouvert
> sur ChatGPT ; onglet Radar conservé. Message explicite de collage/envoi,
> traitement du blocage des fenêtres et de l’échec de copie, FR/DE.
> Retours à la ligne du prompt corrigés. Données de veille inchangées.

> **Retours métier · 28.10.2026 :** Modules / Accompagnement, totaux des groupes
> fermés, prix et jours des options avant sélection, ouvertures et recherche
> conservées. ProConcept rejoint les groupes de modules ; récapitulatif des
> prestations par solution sans double comptage, puis GP/reprise/formation/aide
> et prestations complémentaires nommées. Nouveau détail client PV par logiciel
> et ventilation annuelle Solutions/LCM/hébergement sur les futurs liens ; les
> liens existants restent figés et compatibles. Offre : accompagnement avant
> logiciels, puis technique/services/support. Question éditoriale en graisse
> normale, même police. Abacus négatif vectoriel pour les fonds foncés.
> Aucun tarif, calcul, catalogue, schéma ni donnée métier modifié.
> Validation : 179 tests, build, navigateur 360/430/768/1366/1920/2560 px,
> dérouleurs et sélection, états éditoriaux ouvert/fermé sans débordement.
> Publication demandée explicitement par Alex (GOGOGO et ajout du point 9).

> **Services partagés, blason Gollion et alignement · 28.10.2026 :**
> le même rendu des cartes Hébergement/LCM est utilisé par l’offre interne
> et le lien client. Suppression du doublon « Hébergement : Oui » pour AZ.
> Les deux colonnes de montants du détail sont alignées à droite, avec
> chiffres tabulaires existants. Gollion OFS 5484 ajouté au registre vérifié
> (Wikidata Q70594 / Commons CHE Gollion COA.svg, domaine public) ; son image
> est chargée depuis upload.wikimedia.org, autorisé explicitement dans la CSP
> client. Cache des entrées et des armoiries actualisé.

> **AZ originaux et ligne LCM · 28.10.2026 :** semi-négatif transparent
> fourni par Alex pour les fonds sombres ; original positif pour les fonds
> clairs. Fichiers copiés sans transformation, filtres et mélange retirés.
> Ligne LCM Gold rendue en texte courant avec espaces normaux dans la carte.
> Cache des deux entrées actualisé. Publication autorisée par Alex.

> **Offre client · séparation éditorial/chiffres · 28.10.2026 :** espace
> réservé de 32 px sous le contenu éditorial, défini par un seul paramètre
> du bandeau et appliqué par la règle propriétaire existante du hero.
> Suppression de la surcharge padding-bottom à 18 px. Dernière marge de
> paragraphe et padding de copie restent nuls ; même séparation ouvert/fermé.
> Valeur choisie pour retrouver la respiration de la capture de référence.

> **Offre client · espacement et texte des services · 28.10.2026 :** marges
> cumulées sous le bloc éditorial retirées, espace final de 18 px. Textes des
> cartes Hébergement/LCM harmonisés à 14 px ; titres et emphases à graisse 700.
> Logo AZ conservé à la demande d’Alex, qui prépare les originaux.

> **Optimisation offre communale · 28.10.2026 :** deux paragraphes éditoriaux,
> coûts d’investissement / fonctionnement annuels / total cinq ans sur trois
> colonnes, unités CHF HT, référence rapprochée de l’identité et blocs
> Hébergement/LCM cohérents, alternative Platinum intégrée au bloc LCM.
> Empilement des chiffres et services sous 850 px. Montants inchangés.
> Huit tests ciblés réussis ; publication autorisée par Alex.

> **Offre client · rubrique de journal · 28.10.2026 :** variante validée
> « Filet orange » : libellé blanc, capitales espacées à 14 px, filet orange
> fin prolongé à droite. Espacement adapté sur Natel. Changement uniquement
> visuel du nom de rubrique ; texte, question et dérouleur conservés.
> Cache CSS actualisé. Publication expressément autorisée par Alex.

> **Offre client · invitation toujours visible · 28.10.2026 :** libellé
> « Le bon sens paysan de Prime. ». La question est le summary natif cliquable,
> visible en entier lorsque le bloc est fermé, avec chevron adjacent. À
> l’ouverture, la question occupe la colonne gauche et la réponse la droite ;
> sur Natel, la réponse apparaît dessous. Même graisse 700, taille et approche
> typographique que le titre principal ; aucun texte de question dupliqué.
> Validation ciblée : 10 tests réussis, dont FR/DE, texte exact, typographie
> française et question présente une seule fois dans le summary.
> Publication expressément autorisée par Alex ; améliorations LCM/AZ conservées.

> **Offre client · composition éditoriale validée · 28.10.2026 :** le bloc
> utilise toute la largeur : grande question à gauche, argumentaire à droite.
> Sur Natel (jusqu’à 600 px), question, texte et montants se suivent sur une
> colonne. Deux tailles dans le bandeau : 44/14 px, puis 32/14 px sur Natel.
> Texte français exact et emphases conservés ; ouverture via « Le bon sens
> Prime. », repliée par défaut. Publication explicitement autorisée par Alex.
> Vérification ciblée : 8 tests du rendu public FR/DE et versions 1/2 réussis.

> **Offre client · Le bon sens Prime · 28.10.2026 :** texte français repris
> exactement selon la validation utilisateur, libellé allemand actualisé, phrase
> ajoutée sur le chiffrage estimatif retirée du bloc éditorial. Une seule taille
> de 14 px pour le bloc ; hiérarchie par le gras et l’orange, sans séparateur.
> Le dérouleur reste fermé par défaut, après la référence et avant les montants.
> Vérification ciblée : 8 tests réussis, dont rendu public FR/DE et versions 1/2.

> **Lecture des prestations et des marges · 24.10.2026 :** le résumé par solution
> additionne les jours des lignes de module et des forfaits de groupes dans
> Projet et Prestations, puis distingue les prestations communes. Les jours
> connus restent visibles quand une option manque. L’accès interne conserve
> son ouverture sur les taux et affiche d’abord les marges logicielles en CHF
> et % du PV, selon les mesures existantes du moteur. Les coûts inconnus sont
> explicités, sans présenter ces marges comme la marge globale du projet.
> Une référence supplémentaire de prestations a été ajoutée dans une version
> protégée, sans changement de taux, de référence par défaut ou d’anciennes
> offres. Les données financières d’audit restent hors du dépôt public.
> Validation : 160 tests, 24 parcours + 12 cas partiels, six largeurs, deux
> apparences et FR/DE. [Recette](docs/chiffrage-lecture-prestations-marges.md).

> **Check-up fonctionnel · 24.10.2026 :** reprise de la production `aec6d002`.
> Les points bloquants sont listés et reliés aux champs précis, avec ouverture
> des détails et focus. L’alerte SQL suit le prix retenu, y compris zéro, et se
> réactive si ce prix est effacé. Le zéro de référence ou d’une prestation
> facultative absente est visible, sans inventer les prix inconnus. Les offres
> sans référence ne font plus planter Synthèse ni déclencher à tort l’étiquette
> « ancien standard ». Partage à finaliser et export conduisent à la correction ;
> les liens publics et leurs compteurs sont conservés. La cascade des champs
> utilise réellement les surfaces communes, teintées et bordées dans les deux
> apparences. Moteur/catalogues inchangés. 157 tests, 24 parcours sur six largeurs.
> Voir [la recette](docs/chiffrage-checkup-20261024.md).

> **Chiffrage · cadre commun bêta design, 23.10.2026 (r6) :** les six onglets
> partagent l’en-tête issu de l’Offre. Navigation et identité précèdent une grille
> de contenu indépendante ; le résumé Natel suit le contenu. Plus de bandeau
> tarifaire au-dessus des onglets ni de deuxième champ de titre dans Projet.
> Hébergement et « Prime et partenaires » sont deux postes distincts dans les
> trois présentations financières. Les messages suivent les changements FR/DE,
> avec suffixe de copie localisé et affichage localisé des références prévues.
> 128 tests, build, 144 contrôles de structure et parcours d’édition/comparaison
> réussis. [Recette r6](docs/chiffrage-structure-r6.md). Moteur inchangé.

> **Chiffrage · offre et liste, 23.10.2026 (r5) :** repère vert agrandi,
> fond avec le PNG original du symbole Prime, trois compositions documentées.
> L’offre résume les thèmes des solutions sélectionnées sans limiter la liste
> aux quatorze premières lignes. La liste affiche le canton, l’investissement,
> l’annuel et le total cinq ans (investissement + quatre annuités), depuis les
> révisions enregistrées, avec chargement paresseux limité à trois lectures.
> Prix indisponibles et totaux provisoires restent explicites. Références
> tarifaires consultables dans un volet replié. Moteur et données inchangés.
> Validation : 126 tests, build, 48 contrôles de rendu, erreur de lecture et
> état incomplet. Voir [la recette r5](docs/chiffrage-affinage-r5.md).

> **Chiffrage · hébergement Abacus, 23.10.2026 :** Alex confirme la même règle
> d'hébergement que ProConcept. La version commerciale privée r3 reprend le
> montant ProConcept pour Abacus, sans changer les autres paramètres ni les
> anciens chiffrages. Vérification de l'égalité des montants et de l'absence de
> doublon si les deux ERP sont choisis.

> **Chiffrage 3.0 — essai d’interface, 29.09.2026 :** l’éditeur réorganise le
> chiffrage en Composer, Licences et options, Prestations, PV et taux, Analyse.
> Le résumé client distingue investissement, annuel et cinq ans ; les marges et
> coûts incomplets sont dans Analyse. Les taux commerciaux peuvent être adaptés
> par chiffrage, avec recalcul identique côté client et serveur. Le choix ERP
> relie les modules d’intégration innosolv 21 (Abacus) et 22 (ProConcept).
> Les modules compteurs 501/502/533 restent bloqués tant que leurs règles
> tarifaires Versorger sont non vérifiées. Aucun prix n’est déduit pour eux.

> **Affinage 2.5 — 27.09.2026 :** le panneau Paramètres n’utilise plus d’emoji dépendant du rendu Windows ; la roadmap produit est volontairement synthétique, la 3.0 reste dédiée au Chiffrage et une 3.5 regroupe infrastructure Prime, accès et historique du marché.

> **Jalon produit 2.5 — 27.09.2026 : terminé.** La roadmap affichée dans l’application est alignée sur le socle consolidé 2.5 ; la prochaine grande version est **3.0 — Chiffrage**. Les idées de copilote IA sont déplacées en brainstorming futur non planifié.

## Maintenance après intégration

2026-09-26 : préférences d'apparence simplifiées à deux Skins, Prime Dark et
Helvetia Hell. Le nouveau mode Automatique suit le thème clair/sombre du système
et réagit à ses changements ; l'ancienne préférence Clair est relue comme
Helvetia Hell pour préserver les navigateurs existants.

2026-09-25 : séparation discrète entre les filtres de Communes et les boutons
« Territoire » / « Systèmes ». Trait vertical sur grand écran, horizontal sur
écran plus étroit ; aucune logique de filtre modifiée. `npm run check` (65 tests)
et `npm run build` réussis.

Le rebuild et l'édition de l'hébergeur sont intégrés à `main` au commit
`a03838c`. La migration d'édition de l'hébergeur a été installée en production.
Les consignes de branche ci-dessous décrivent le chantier historique, clôturé.

Correction de suivi sur `fix/commune-search-render` : retour de la
recherche dédiée sur Natel, avec le champ en haut et les résultats dessous.
Choisir un résultat filtre la liste normale sur la commune et fait défiler
jusqu'à sa ligne ; seul un clic ultérieur sur cette ligne ouvre le portrait.
La vérification en production a révélé que les événements de saisie utilisaient
encore l'ancien rendu des lignes, ce qui rouvrait directement l'édition.
Les événements utilisent désormais le rendu communal enrichi courant.
Le desktop conserve son filtre direct. Aucun changement de données ou de SQL.
Vérifications locales : `npm run check` (63 tests) et `npm run build` réussis.

Dernière mise à jour : 2026-09-22 UTC

## Point sûr

- Branche locale et distante : `rebuild/prime-communes-2.0`
- Baseline `main` : `b327d57126cf5dd8d5291ff1487d9af21a9c8cb9`
- Checkpoint applicatif et CSS déjà publié :
  `09b1328cf334bddd32f0621c68879ccdd32784de`
- Le commit qui contient ce document est le checkpoint final de clôture.
- `main` est intact ; aucun merge automatique n'a été effectué.

## État du chantier

Le rebuild est terminé et prêt pour inspection humaine. Aucun nouveau chantier
CSS ou JavaScript n'est ouvert.

- `app/main.js` est l'unique entrée JavaScript produit et importe explicitement
  le shell, DATA et les six vues.
- `app/core/runtime.js` isole le shell et la compatibilité requise par les
  runtimes historiques conservés.
- `app/styles/main.css` est l'unique entrée CSS.
- La cascade est organisée selon les quatre responsabilités du cahier des
  charges : fondations, composants, vues et responsive.
- Les douze anciennes feuilles chronologiques ou de compensation ont été
  supprimées après consolidation.
- Les occurrences de `!important` passent de 184 à 3, toutes justifiées.
- Les six onglets restent accessibles sur Natel dans une grille 3 × 2.
- Les données, Supabase, les six vues, les workflows et l'identité visuelle sont
  conservés.

## Correction finale du raster Carte

Le premier build de clôture a révélé un chemin CSS hérité vers
`swiss-base.webp`, devenu invalide après le déplacement de la feuille Carte.

- `vite.config.ts` utilise une base relative (`./`) pour rendre la sortie
  déployable sous un sous-chemin.
- Le runtime Carte résout le raster depuis `import.meta.env.BASE_URL`, avec le
  repli source `public/`.
- `styles/views/map.css` ne porte plus de chemin relatif fragile.
- La sortie contient `dist/swiss-base.webp` et le bundle référence
  `./swiss-base.webp`.
- Une barrière de test protège ce contrat.

## Contrôles finaux

- `git diff --check` : réussi.
- `npm run check` : 60/60 tests réussis.
- `npm run build` : réussi, 16 modules transformés.
- Sortie de clôture : HTML 35,15 kB (gzip 12,37 kB), CSS 131,60 kB
  (gzip 36,01 kB), JavaScript 113,18 kB (gzip 34,96 kB).
- Aucun avertissement de ressource non résolue. L'avertissement npm relatif à
  `http-proxy` appartient uniquement à l'environnement d'exécution.

## Recette visuelle et fonctionnelle acquise

La recette post-CSS du checkpoint `09b1328c` a été menée aux six largeurs
réelles : 360 × 780, 430 × 932, 768 × 1 024, 1 366 × 768,
1 920 × 1 080 et 2 560 × 1 440.

- Six onglets et six vues contrôlés sur Natel et desktop, sans collision ni
  débordement global.
- Recherche Lausanne, état vide, réinitialisation, filtre Clients Prime
  (74 résultats) et contrôle Delimo validés.
- Portrait Zürich, correspondance OFS 261, Wikipédia et passage à la
  modification validés.
- Actualisation manuelle et états `loading`, `success`, `fallback` et `error`
  couverts ; succès observé avec 2 110 communes.
- Scroll profond, retour en haut, deep-links, refresh, Retour/Suivant et
  navigation des six vues validés.
- Carte : interface, données et état d'échec WebGL2 contrôlé.
- Aucune erreur applicative console sur ces parcours hors état MapLibre/WebGL2 ;
  les messages d'extension navigateur ont été identifiés comme externes.

## Documentation finale

- `docs/architecture-design.md` : architecture, responsabilités et règles
  d'extension.
- `docs/rebuild-playbook.md` : commandes, matrice de recette et procédure de
  reprise.
- `docs/rebuild-report.md` : rapport avant/après, suppressions, validations,
  différences et risques.
- `docs/rebuild-baseline.md` : preuve et architecture cible de la baseline.
- `AGENTS.md` : règles locales pérennes pour les prochains travaux.

## Limites connues

- Le navigateur distant ne fournit pas WebGL2. Le fallback MapLibre est validé,
  mais le rendu GPU doit être confirmé sur un navigateur matériel avant merge.
- L'ancienne URL GitHub Pages répond 404 ; la recette a utilisé des URLs CDN
  immuables basées sur les SHA.
- `core/runtime.js` conserve une surface de compatibilité globale isolée et
  testée ; elle ne doit pas être étendue.
- MapLibre et ses glyphes restent des dépendances réseau externes.

## Reprise ou inspection

```sh
git branch --show-current
git rev-parse HEAD
git status --short --branch
cd cities
npm run check
npm run build
```

La branche attendue est `rebuild/prime-communes-2.0`, propre et alignée sur son
homologue distant. La prochaine action est une inspection humaine, complétée si
possible par un contrôle Carte avec WebGL2 matériel. Ne pas rejouer l'audit ou
la baseline, ne pas travailler sur `main` et ne rien merger automatiquement.
# Chiffrage — corrections de configuration du 22 octobre 2026

- Commune et volumes : compteurs et taxes suggérés à un tiers des habitants,
  arrondi au multiple de 500 supérieur, avec respect des valeurs modifiées.
- Énergie : sélection groupée des licences 501/502/533 du catalogue Versorger.
  Les tarifs privés sont toujours marqués non validés : aucune interpolation
  inventée ; PA/PV annuels manuels possibles et brouillon incomplet conservable.
- Hébergement : Oui/Non avant les montants, exclusion effective des calculs sans
  effacer les lignes, compatibilité avec les anciennes révisions. Aucun tarif
  AZ n'est supposé. LCM : ajustements manuels repliés.
- Choix radio/cases de même taille, composition en colonnes sur ordinateur,
  empilement sur Natel. Les identifiants de cache sont synchronisés pour éviter
  de mélanger les nouveaux messages avec un ancien module après publication.
- Sauvegarde : brouillons explicitement incomplets sans faux total, refus de
  l'export correspondant ; messages ciblés pour SQL, paliers, LCM et session.
  Une panne de liste après une écriture réussie n'est plus présentée comme une
  perte de la sauvegarde. Reconnexion possible sans perdre le formulaire.
- Diagnostic en lecture seule : refus HTTP 400 observé sur une sauvegarde du
  22 octobre ; deux causes reproduites (prix SQL par cœur manquant et palier
  Abacus inférieur absent). Le contenu du brouillon refusé n'était pas disponible,
  donc sa cause exacte n'est pas affirmée. Les trois révisions existantes ont
  été recalculées localement avec leur catalogue privé, sans écriture distante.
- Schéma, données privées et paramètres commerciaux distants inchangés.
- Aperçu isolé : `docs/chiffrage-preview.html`, uniquement données fictives et
  API en mémoire, avec six largeurs, FR/DE, deux Skins et simulation d'erreurs.
- Publication coordonnée nécessaire : frontend + fonction Edge et ses modules
  calculate/configuration/errors. Aucun déploiement ni merge de main automatique.

## Refonte du configurateur · en cours · 22 octobre 2026

- Espace de configuration unifié, synthèse latérale sur ordinateur, barre compacte sur Natel ; apparences et FR/DE préservés.
- Présentation client par défaut. Les PA, coefficients et marges ne sont construits dans le DOM qu'après accès interne volontaire ; retour client explicite.
- Références de prestations chargées uniquement depuis le catalogue privé, clonées dans chaque chiffrage ; réapplication confirmée et ajustements conservés lors des désactivations temporaires.
- GP en pourcentage opt-in, assiette de jours Prime explicable, arrondi provenant de la référence ; compatibilité des anciennes lignes fixes.
- Contrôles à ce stade : 105 tests réussis, build réussi. Recette visuelle en cours.
- Aucun tarif privé, aucune source Excel commerciale dans le dépôt. Aucune modification de données Supabase.
- Activation d'une nouvelle référence privée et publication coordonnée à préparer après vérification des sources ; les prix énergie restent non vérifiés.

### Contrôle fonctionnel du configurateur

- 110 tests réussis et build réussi ; contrôles financiers des trois anciennes
  révisions : lignes et montants identiques avec le moteur antérieur.
- 59 vérifications privées des arrondis énergie et de l'assiette GP, sans données
  commerciales dans le dépôt ni écriture distante.
- Préparation reproductible de quatre références privées ; source absente
  explicitement signalée pour certaines prestations Abacus. Référence hébergement
  limitée au périmètre prouvé par le fichier, aucune généralisation tarifaire.
- Export client par liste positive, distinct de l'export interne complet.
- Publication de production et activation privée non effectuées : voir
  `docs/chiffrage-configurateur.md` pour la coordination et les limites de source.

### Recette du configurateur · préparation de publication

- Les six formats ont été mesurés dans le navigateur : 360 × 780, 430 × 932,
  768 × 1 024, 1 366 × 768, 1 920 × 1 080 et 2 560 × 1 440 ; aucun
  débordement horizontal du configurateur.
- Parcours réel sur données fictives : changement ERP avec interface, jours de
  formation personnalisés conservés, GP recalculée, hébergement ajouté/retiré
  sans duplication, sauvegarde et lien de reprise disponibles.
- Accès interne : confirmation affichée, bandeau visible, puis retour client
  retirant les champs PA/marges du DOM.
- Contrôles finaux : 111 tests, build, trois révisions historiques inchangées.
- Une référence d'hébergement liée à un ERP nécessite une confirmation explicite
  si le périmètre change ; les montants ne sont ni effacés ni réappliqués.
- SQL privé prêt pour import inactif, activation protégée et retour aux versions
  antérieures ; aucune écriture ou activation de données effectuée.

### Rapprochement métier final

- Contrôle d'une référence commerciale complète : écarts de 0,00 CHF pour
  investissement, coût annuel et TCO cinq ans, sur le périmètre Excel fourni.
- Nouvelle politique privée PCE : base des finances et options, interface séparée,
  vente des salaires selon la formule source ; aucune modification des versions
  historiques. SQL par utilisateur selon la même source, prix par cœur non inventé.
- Options Prime et partenaires inclus au premier chiffrage selon la référence ;
  jours et prix journalier propres aux partenaires, GP sans double comptage.
- Déplacements calculés après GP sur les jours du projet, partenaires inclus ;
  remise explicitement distincte et modifiable selon la source.
- 114 tests réussis, build réussi, trois révisions historiques inchangées.
- Le rapprochement porte sur ce cas complet, pas sur tous les périmètres possibles.

### Présentation finale

- Les deux apparences ont été mesurées aux six formats ; FR et DE contrôlés,
  dont DE à 360 et 1 366 px, sans débordement horizontal.
- Aperçus de contrôle et captures réalisés sur données entièrement fictives,
  avec le module de vue et le moteur réellement livrés.
- PR de livraison : #41. Production et activation de la nouvelle version privée
  en attente du GO ; aucune modification de données Supabase effectuée.

### Publication et retours Natel · 22 octobre 2026

- PR #41 fusionné dans `main` (`8058b15`) ; CI et Pages réussis, fonction
  `chiffrage` version 9 et références privées du configurateur actives.
- Le premier essai Bex a conservé un ancien catalogue dans un onglet déjà
  ouvert. Les nouvelles créations rechargent désormais les versions actives.
- Une ancienne révision propose une variante explicite avec la référence
  actuelle ; le snapshot original et les valeurs saisies restent intacts.
- Sur Natel, contrôles ERP homogènes, lignes de prestations par module
  compactées, chiffres alignés et répétitions supprimées. Les noms métiers
  remplacent les codes techniques dans le détail client.
- La synthèse affiche le prix LCM disponible même lorsqu'un autre élément
  rend le chiffrage incomplet.
- Préparation Excel : les jours Abacus du fichier Fribourg étaient lus depuis
  une colonne monétaire à cause d'un décalage. La colonne de jours est
  identifiée par le libellé et sa valeur source, puis contrôlée séparément.

### Configurateur · présentation de l’offre et corrections · 23 octobre 2026

- Évolution du moteur partagé : SQL sans prix par cœur et hébergement sans
  référence laissent les montants connus visibles, avec état incomplet et export
  bloqué. Aucun tarif SQL extrapolé de Fribourg ni modification des catalogues
  privés et des anciennes révisions.
- Estimation des collaborateurs selon la grille fournie, en conservant les
  nombres personnalisés. Gold et Platinum, SQL et hébergement montrent les
  valeurs effectives directement dans leurs contrôles.
- Choix initiaux, dimensionnement et références visibles ensemble ; modules
  retenus par logiciel et domaine, recherche des options ; prestations en
  lignes compactes. Carte communale issue de la géométrie publique existante,
  avec repli sur le canton sans faux blason.
- Une vue Offre client distincte utilise les mêmes résultats : investissement,
  annuel dès la deuxième année et un seul coût sur cinq ans. Comparaison de
  deux ou trois variantes enregistrées de la commune, écarts de montants et de
  périmètre, signalement des versions tarifaires différentes.
- Vérification : 116 tests, build, rapprochement Tolochenaz à 0,00 CHF sur le
  périmètre déjà fourni. Aperçu fictif servi sur un commit immuable dans le
  navigateur distant : configuration desktop, offre, les six largeurs et
  apparence claire/allemand à 360 px contrôlés sans débordement. Le repère
  territorial et le contraste du titre en clair ont été corrigés. L’interface réelle
  authentifiée et les tarifs privés restent à contrôler après publication.

### Chiffrage · reprise visuelle · 23 octobre 2026

- Reprise de la livraison #45 : logo officiel, tableaux alignés, titres lisibles,
  licences et partenaires compacts, comparaison structurée de 2–3 variantes.
- Chemins publics corrigés pour la carte, les emblèmes cantonaux et le logo,
  selon le mode source GitHub Pages ou le build Vite. Six blasons communaux
  vérifiés et stockés avec leur provenance ; recherche OFS vérifiée pour les autres.
- Résultats sauvegardés utilisés en priorité en comparaison, requêtes concurrentes
  protégées et variations financières visibles après modification.
- 122 tests et build réussis ; matrice statique de 144 contrôles (six largeurs,
  deux apparences, FR/DE), plus parcours de saisie/sauvegarde/comparaison sur
  données fictives. Captures et limites : `docs/chiffrage-validation-visuelle.md`.
- Moteur et catalogues privés inchangés. Pas de modification de données live.
  Les catalogues privés, le rapprochement Excel et l’export réel n’ont pas été
  revérifiés faute de session privée ; ne pas annoncer une recette métier complète.

## Consolidation graphique offre — 27.10.2026

Branche `refactor/chiffrage-shared-presentation`, base `034bdd4`. Composants
purs et CSS communs extraits, bandeau/fonds unifiés, anciennes surcharges
retirées. Moteur et serveur inchangés. 170 tests et build réussis.
Recette navigateur et Safari non réalisée : intégration en attente de contrôle
visuel. Diagnostic et critères : [rapport](docs/chiffrage-shared-presentation.md).

## Finition commerciale offre — 28.10.2026

Logo AZ horizontal officiel, traitement clair/négatif dans le composant partagé.
LCM : bénéfice support/hotline explicite, Gold et Platinum comparés dans le
même détail, phrase de remplacement unique. Règle typographique française
centralisée dans i18n et les adaptateurs chiffrage/client ; ponctuation double
protégée, sans toucher aux chiffres ni aux données sauvegardées.
Recette technique : 175 tests et build. Pas de validation Safari réelle.

## Offre client · identité communale compacte — 02.11.2026

- Nom communal et canton agrandis (22–28 px selon l'écran), sur une première
  ligne ; OFS et habitants en gras à 14 px, référence/version et révision en
  poids normal sur la deuxième ligne, avec retour naturel si nécessaire.
- Suppression de la répétition du nom dans la référence ; titres personnalisés
  conservés. Présentation interne, données et montants inchangés.
- 179 tests réussis et build Vite réussi. Contrôle navigateur non réalisé :
  l'aperçu géré est refusé par Vite (`terminal.local` non autorisé).

## Offre client · répartition annuelle — 02.11.2026

- « Logiciels » remplace « Solutions » dans le détail annuel. Unité CHF HT / an
  affichée une seule fois ; troisième colonne de parts annuelles arrondies au
  pourcent, calculées depuis le total sauvegardé. Total nul : part non applicable.
- Tableau compact de trois postes, montants alignés et pourcentages secondaires.
  Les tarifs et les montants sauvegardés ne changent pas.
- Tests de présentation (FR/DE, arrondis, total nul et absence de détail),
  contrôles complets et build Vite ; contrôle navigateur non réalisé, aperçu
  géré précédemment refusé par la configuration d'hôte Vite.

## Catalogue et offre client — 02.11.2026

- Mise en oeuvre regroupée en paramétrage/intégration et accompagnement au
  déploiement, avec sous-totaux, total, lignes compactes et colonne annuelle
  seulement si elle contient un montant non nul. Prime identifié explicitement ;
  déplacements estimés distingués des déplacements offerts.
- Répartition annuelle repliable sous les trois montants. Corps de lecture
  client à 16 px sur desktop, rendu Natel conservé.
- Fonctions incluses génériques rattachées à un parent, affichées sans
  sélection et sans prix supplémentaire. Catalogue éditable dans l'éditeur
  authentifié, avec versions commerciales et contrôle de concurrence.
- ProConcept : 8 fonctions financières et 2 fonctions salaires ; 4 options
  Prime indépendantes avec jours proposés et annuel fixe explicite.
- Les contenus sont figés dans les révisions et les publications. L'enrichissement
  des offres PCE en cours est explicitement autorisé par Alex dans ce chantier ;
  montants, jetons, échéances et compteurs des liens doivent être conservés.
- Migration 20261102164122 appliquée : une RPC invoker, réservée à
  service_role, clone atomiquement le catalogue commercial. Essai transactionnel
  de clonage annulé après vérification. Pas de nouvel accès public aux tables.
- Vérifications : compilation syntaxique des sources, tests de domaine et CI.
  Environnement local et navigateur indisponibles : pas de recette visuelle ni
  de validation Safari. Ne pas annoncer une validation visuelle complète.


## Offre client · rubriques et repères éditoriaux — 02.11.2026

- Trait éditorial court de 48 px avant la signature sur PC, ligne droite
  conservée ; triangle annuel orange et logo Prime agrandi de 10 %, proportionnel.
- Rubriques génériques repliées par défaut et commande commune Tout déplier /
  Tout replier, après clarification de l'utilisateur. Le module parent apparaît
  en première puce : Finances + 8 inclus = 9 ; Salaires + 2 inclus = 3.
- Puces pleines, retrait et taille identiques aux listes ordinaires ; espacement
  de 6 px entre titre ouvert et liste. Composant commun à tous les logiciels.
- Aucun changement de tarif, de catalogue ni de données sauvegardées.
- Contrôles ciblés de présentation et navigation de l'aperçu avec les sources
  réelles sur six largeurs. Le contrôle navigateur concerne cet aperçu isolé ;
  aucune ouverture de lien client et aucun compteur consommé pour la recette.
- Validation finale : `npm run check` (188 tests), `npm run build` et `git diff --check` réussis ; ouverture globale, fermeture et état partiel contrôlés au navigateur.

## Offre client · alignement des triangles — 02.11.2026

- Le marqueur natif des rubriques passe en position extérieure : triangle et puces partagent le même retrait, titre et modules le même départ de texte.
- Correction CSS ciblée, commune à tous les logiciels ; aucun changement fonctionnel ni financier.
- Cache des feuilles actualisé pour les liens existants.

## Classement des modules · 04.11.2026

- Classement commun interne / projection client : standard Prime dans l'ordre
  Licences&Presta, compteurs 501/502/533, options retenues ; options disponibles
  réparties entre sélection commerciale et autres options, puis chapitres Gemeinde.
- Sélection commerciale validée par Alex, incluant les ajouts 207, 138 et 136.
  Les modules déjà retenus restent affichés quelle que soit leur catégorie.
- Abacus : responsables de visa rattachés aux créanciers ; familles transversales
  regroupées sous Fonctions complémentaires, CRM/Tool-Kit sous Programmes obligatoires.
- La vue client ne publie que les noms et rubriques des modules retenus. Les
  nouveaux classements ne modifient ni calcul, ni prix, ni jours, ni sélection.
- Rubriques repliées par défaut et commande Tout déplier / Tout replier conservée.
- Validation : 192 tests et build réussis, puis 13 tests ciblés après le dernier
  ajustement de libellé. Aperçu client sur six largeurs sans débordement ; aperçu
  du vrai rendu productSection avec les libellés Ballaigues : recherche Archivage,
  visibilité des 20 modules retenus et présence des trois ajouts vérifiées.
- Publication serveur préparée à partir de la version live 20 vérifiée identique
  aux sources main ; authentification inchangée. Actualisation des cinq scopes
  des liens actifs préparée avec garde sur l'ancien scope et invariance de tout
  le reste du payload. Aucun lien client ouvert pour la recette.
- Roadmap et repères Bêta Radar!/Histoires : propositions uniquement à ce stade.

## Roadmap et statuts bêta · 04.11.2026

- Validation utilisateur de la roadmap proposée : Chiffrage disponible et en
  évolution, prochaines étapes catalogue/règles/Excel, comparaison PV et marges,
  calibration des jours, configuration client à préciser ; UX transversale.
- Radar! et Histoires partagent le badge Bêta dans les onglets et une courte
  mention dans leur page, en français et en allemand, PC et natel.
- Rubrique innosolv renommée Modules de base innosolv, selon la nuance donnée.
- Références de cache des traductions et de leurs consommateurs actualisées.
- Validation : 192 tests et build, navigation et traductions FR/DE, six largeurs
  sans débordement et statut visible dans les deux apparences.

## 2026-11-04 · Référentiel global des règles

- Dictionnaire indépendant des communes : 53 articles, 11 chapitres, origine et
  validation métier séparées ; intentions futures explicitement identifiées.
- Recherche accent-insensible, filtres chapitre/état, détails et tout déplier/replier.
- Paramètres actifs et grilles par article lus via le catalogue authentifié ;
  aucune copie de tarif privé dans le dépôt et aucune écriture en base.
- Accès depuis le header du chiffrage. Retour au contexte et brouillon conservés ;
  catalogue actif du référentiel distinct du catalogue d'une offre historique.
- Documentation : `docs/chiffrage-rules-reference.md`. Contrôle ciblé registre,
  exemples du moteur, échappement des données et absence de mutation.
- Vérification : 198 tests passent et build réussi ; 11 contrôles ciblés repassés
  après finition. Six largeurs 360–2560 px sans débordement du registre,
  recherche, ouverture/fermeture, réinitialisation, grilles et paramètres vérifiés.
  Commandes FR/DE et apparences Prime Dark/Helvetia contrôlées sur recette
  synthétique ; rédaction métier française explicitement indiquée en allemand.

## 2026-11-04 · Défilement horizontal du référentiel sur Natel

- Le conteneur des paramètres limite désormais sa largeur et porte le
  défilement horizontal natif ; tableau à largeur minimale lisible, cellules
  autorisées à revenir à la ligne. Région accessible au clavier et au toucher.
- Recette réelle à 360 px : document 345 px sans débordement global,
  tableau 600 px dans un conteneur 225 px ; scrollLeft passe de 0 à 40
  avec une action clavier. 11 contrôles ciblés passent.

## 2026-11-04 · Tableaux métier compacts dans tout le référentiel

- Remplacement du déroulé de chemins techniques par des tables adaptées : LCM
  tranche/Gold/Platinum, Oracle Full/Light × acquisition/annuel, SQL paramètres
  courts et repères habitants/utilisateurs, PA/PV par classe, options/prestations
  en colonnes et grilles par palier. Tous les autres groupes utilisent des
  libellés locaux, sans répéter le chemin parent à chaque ligne.
- Conditions supplémentaires, explications et sources conservées dans des
  replis distincts ; les noms des modules sont lus dans le catalogue chargé.
  Les articles n'affichent que leurs paramètres pertinents. Aucun tarif,
  calcul, droit, enregistrement ou lien client modifié.
- 14 contrôles ciblés passent. LCM/SQL vérifiés à 360 px et LCM sur les six
  largeurs 360–2560 px, sans débordement global. Recette synthétique uniquement.

## 2026-11-04 · Vitrine consultative d'options
- Pour aller plus loin, replié, distinct des licences et fonctions incluses.
  Trois vignettes, trois possibilités supplémentaires au maximum derrière
  un deuxième repli. Aucune liste automatique côté client.
- Offre → Options à présenter au client : sélection, rédaction, jours,
  ordre et retrait. Compatibilité et présence dans le périmètre vérifiées.
- Suppléments via le moteur sur une copie ; aucun effet sur les totaux.
  Métadonnées conservées dans le JSON d'entrée ; publication de textes/PV
  seulement. Aucun changement de schéma, tarifs ou offre existante.
- 208 tests et build passent avant perte de l'environnement de travail ;
  30 contrôles ciblés après finition, six largeurs sans débordement.
  Replis inclus/options indépendants et détails vérifiés en recette synthétique.
- Publication poursuivie depuis le dépôt après indisponibilité de l'environnement.
  CI requise sur les sources finales avant intégration. Règle S08 documentée.


## 2026-11-06 — Finition de la présentation client

- CSS partagé : échelle 4/8/12/16/24/32/48 et relations sémantiques ;
  cartes 16 px, rubriques 32 px, padding 16/24 px. Cumul avant les options
  supprimé, variantes responsive regroupées, focus et triangles unifiés.
- Hiérarchie des montants : investissement/annuel alignés ; cinq ans secondaire.
  Colonnes des prestations stables, logos proportionnés, footer PDF compact.
- Recette : 48 cas Chrome (six largeurs, FR/DE, ouvert/replié, public et fixture
  des composants internes). Aucun débordement ; écart financier 0 px ;
  cible minimale 44 px. 219 tests et build réussis, commande PDF vérifiée
  sur réponse locale. Aucun appel aux publications ni écriture métier.
- Détails et limites : docs/offer-presentation-qa.md. Pas de validation Safari
  ni d'iPhone physique ; parcours interne authentifié non rejoué.
- Sources préparées pour revue ; pas de merge automatique de main.

## 2026-11-06 — Espace de travail interne du chiffrage

- Bandeau communal reconstruit pour le vendeur, renommage explicite, navigation
  générale compacte limitée à l'éditeur. Résumé mobile/latéral et onglets sticky ;
  une seule barre Enregistrer/état/Actions en bas, menus clavier et focus direct.
- Options en fiches repliées, champs rédactionnels en une colonne sur Natel,
  jours/annuel alignés par subgrid. Prestations et ajustements compactés ;
  synthèse financière avant les justificatifs dépliables.
- Propriétaires CSS séparés, anciennes surcharges des prestations retirées du
  responsive général. Aucun moteur, tarif, schéma, publication ou offre modifié.
- Premier champ à 570 px au lieu de 1409 px sur 430 px ; 589 au lieu de 1476
  sur 360 px. 168 cas navigateur finaux sur six formats, FR/DE, deux skins.
  223 tests et build réussis. Détails : docs/chiffrage-workspace-qa.md.
- Données de recette synthétiques, vrai runtime ; pas de Safari/iPhone physique
  ni d'actions serveur en production. PR préparée pour revue, sans merge auto.

## 2026-11-06 — Ouverture du dossier au sommet

- Nouveau chiffrage et ouverture d'un dossier existant demandent explicitement
  un départ en haut. Les rafraîchissements pendant le travail conservent leur
  position ; changer de rubrique garde son accès direct au panneau.
- Politique de défilement dans workspace-ui.js, test des trois états (ouvrir,
  conserver, position nulle). 224 tests et build réussis. Ouverture depuis la
  liste vérifiée en recette Natel, position 0 ; saisie ensuite à 626 px.
- Aucun style ou calcul modifié ; audit des triangles/couleurs communiqué
  séparément, sans élargir ce correctif. Cache du runtime renouvelé.

## 2026-11-07 — Indicateurs et textes lisibles

- Dépliés de l'éditeur : triangle plein 8 × 10 px, même géométrie que l'offre
  publique, indépendant de la police et du marqueur Safari. Orientation seule
  différente selon l'état. Orange clair en Dark, orange foncé en Helvetia.
- Séparation des tokens d'accent graphique, texte d'action et texte sélectionné.
  Les onglets actifs sont clairs en Dark ; les liens du chiffrage deviennent
  bleu clair. Les couleurs graphiques, fonds et dégradés restent inchangés.
- 227 tests, build et diff propres ; 3 tests de contraste sur les palettes et
  fonds sélectionnés composités. 96 cas Chrome sur six formats, FR/DE et deux
  skins sans débordement ; marqueurs fermé/ouvert mesurés. Pas d'iPhone physique.
- Dark Jura reste une proposition de troisième thème, sans changement de
  préférence, mode automatique, thème par défaut ou présentation publique.

# Consolidation graphique chiffrage / offre publique — 27 octobre 2026

Base inspectée : `034bdd4` (main, PR #78). Branche : `refactor/chiffrage-shared-presentation`.
Intervention ciblée demandée, sans modification du moteur, des catalogues, du serveur ou des données.

## Diagnostic avant modification

- Deux déclarations `.chiffrage-offer-hero:before` se complétaient dans la cascade : la première définissait notamment le background, la seconde remplaçait dimensions, position et opacité. Le rectangle dépendait de la hauteur du bandeau, différente selon les contenus interne/public.
- Le PNG existant mesure 118 × 350 pixels. La taille du rectangle CSS ne correspondait pas nécessairement à celle du dessin avec `background-size:contain`. L'asset SVG présent est un autre dessin : il n'a pas été substitué à la marque de référence.
- L'URL du PNG était fournie par un attribut style inline. La politique CSP de `offre.html` déclare `style-src 'self'`, sans autoriser les attributs inline. Cette incompatibilité statique est supprimée ; son comportement exact n'a pas été observé dans un navigateur pendant cette intervention.
- Le header utilisait trois dégradés et le résumé financier un autre fond opaque. La rupture était une conséquence de deux surfaces peintes séparément.
- Les deux entrées dupliquaient marque, identité, SVG de carte, chiffres, logos, modules et détail commercial. Les surcharges client répétaient les styles pour compenser les couleurs globales Helvetia.

## Propriétaires désormais communs

`app/offer/presentation.js` : fonctions pures pour bandeau, header, identité, carte, trois montants, groupes de modules, LCM, hébergement et ventilation commerciale. Aucun import, transport, stockage ou moteur interne.

`app/styles/offer.css` : propriétaire des composants, du dégradé, de la marque, de la typographie et du responsive. Un seul pseudo-élément pour le 1, opacité de référence conservée à 0,13, proportions conservées et hauteur plafonnée à la résolution source. L'image provient de la feuille externe, compatible CSP.

`workspaceHero()` et `client-offer.js` sont les adaptateurs. Le premier prépare les données internes ; le second utilise uniquement le JSON publié. Dans l'onglet Offre, le header interne et les montants sont maintenant réunis dans le même conteneur, comme côté client. Les autres onglets gardent leur résumé compact et leur navigation.

Le rendu des groupes de modules reçoit des libellés déjà préparés ; les règles de regroupement métier existantes restent inchangées. LCM Gold/Platinum reprend le texte commercial existant, partagé entre les deux contextes. Les particularités clair/sombre des logos sont conservées ; la présentation commerciale publique reste volontairement bleue.

`client-offer.css` ne contient plus les corrections de header, marque, montants, modules et LCM : seulement enveloppe autonome, erreurs/chargement, anciennes étiquettes de produits, pied de page et impression.

Références de cache mises à jour sur index, offre, main JS/CSS, vue chiffrage et import du nouveau module.

## Validation effectuée

- `npm run check` : 170 tests réussis (164 précédents adaptés au nouveau propriétaire et 6 nouveaux tests).
- `npm run build` : réussi. Le build Vite existant cible index.html ; la page publique reste distribuée en source par GitHub Pages, comme avant. Ce build ne constitue pas une validation navigateur de offre.html.
- Les nouveaux tests exécutent le véritable point d'entrée public avec un DOM de test et un transport simulé : versions 1/2, FR/DE, conservation des totaux, échappement HTML, aucune édition ni données privées rendues, même requête publique et aucune session interne.
- Les valeurs 107’780 / 37’028 / 255’892 CHF sont utilisées exclusivement dans un cas de test à partir des valeurs fournies par le demandeur. La publication réelle Ballaigues révision 4 n'a pas été téléchargée ; ce n'est pas une preuve de lecture du lien existant.
- Tests existants de projection publique, autorisation, révocation et compteur : réussis. Aucun changement aux mécanismes testés.
- `git diff --check` : réussi.

## Recette indispensable restante

Pas de contrôle visuel réel ni de capture comparative réalisés. Téléchargement Playwright invalide ; Chromium installé ensuite via un paquet npm reconnu, mais crash à l’initialisation EGL/Vulkan avant rendu. Navigateur distant également en timeout sur le serveur local. Aucun test Safari/iPhone effectué.

À vérifier avant intégration : interne/public à 360, 390, 430, 768, 1366 et 1920 px, clair/sombre/auto, FR/DE, lisibilité du 1, carte et armoiries, continuité du bandeau, grands montants, débordements, dépliage/repliage LCM ; navigation et édition internes ; partage/copie/ouverture/révocation/compteur avec une session autorisée ; lien existant de Ballaigues r4.

Ne pas considérer la finition graphique comme validée tant que cette recette n'est pas faite. Aucun changement de données ou migration requis.

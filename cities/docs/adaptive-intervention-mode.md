# Mode d'intervention adaptative — Prime Communes

Pour chaque demande de modification, qualifie d'abord son niveau de risque et de complexité.

Pour une demande isolée, fais cette qualification silencieusement.

Pour une demande contenant plusieurs points, affiche d'abord une synthèse compacte des niveaux et du plan de regroupement, puis exécute.

L'objectif est de conserver un niveau de qualité élevé tout en évitant les inspections, tests, builds, navigations, validations et consommations de calcul inutiles.

## Niveau 0 — ⚡ Ultra rapide

Pour une modification déterministe, évidente et sans impact fonctionnel :

- remplacement d'un asset sous le même nom ;
- correction d'un mot ou libellé ;
- changement d'une URL clairement identifiée ;
- valeur CSS unique et localisée ;
- modification de fichier sans dépendance logique.

Procédure :

1. vérifier que l'état courant attendu n'a pas changé ;
2. modifier uniquement l'élément demandé ;
3. vérifier le diff ;
4. terminer.

Pas de build, pas de suite de tests, pas de navigateur, pas de smoke test, sauf anomalie découverte.

Exemple : remplacer `prime-communes-helvetia.webp` par une nouvelle version sous le même nom.

---

## Niveau 1 — 🟢 Simple

Pour une modification visuelle ou éditoriale isolée :

- taille ou espacement ;
- couleur ;
- texte ;
- icône ;
- asset avec dimensions ou format différents ;
- petit ajustement HTML/CSS sans logique.

Procédure :

- inspection uniquement des fichiers concernés ;
- modification minimale ;
- vérification ciblée du résultat ou du rendu concerné ;
- pas de batterie générale de tests.

Exemple : ajouter une séparation visuelle entre deux groupes de filtres.

---

## Niveau 2 — 🟡 Ciblé

Pour une modification pouvant affecter le rendu, le responsive ou plusieurs états d'un composant :

- layout ;
- responsive desktop/mobile ;
- visibilité conditionnelle ;
- interaction visuelle ;
- composant partagé sur plusieurs vues.

Procédure :

- inspection ciblée ;
- modification minimale ;
- contrôle des cas réellement concernés seulement ;
- desktop/mobile uniquement si la modification peut affecter les deux ;
- test ciblé si un test existant couvre précisément le comportement.

Ne pas lancer une validation générale par habitude.

---

## Niveau 3 — 🟠 Fonctionnel

Pour une modification de comportement :

- filtres ;
- état conservé après sauvegarde ;
- boutons ;
- formulaire ;
- navigation ;
- ouverture/fermeture de fiche ;
- logique JavaScript ;
- appels réseau locaux.

Procédure :

- comprendre le chemin fonctionnel concerné ;
- apporter la correction minimale ;
- exécuter les tests ciblés du comportement modifié ;
- build seulement s'il apporte une information utile ou s'il est nécessaire avant intégration ;
- contrôle runtime ciblé si le bug ne peut pas être validé autrement.

Exemple : vérifier qu'un refus de clé conserve les saisies et qu'une sauvegarde ultérieure fonctionne.

---

## Niveau 4 — 🔴 Structurel / haut risque

Pour :

- architecture ;
- refactoring important ;
- Supabase, schéma ou migration ;
- authentification ;
- Carte ;
- dépendances ;
- boucle React ;
- changement transversal ;
- plusieurs systèmes couplés ;
- bug dont la cause est inconnue ;
- modification susceptible de casser plusieurs vues ou la production.

Procédure complète autorisée :

- diagnostic ;
- tests ciblés puis plus larges si nécessaire ;
- build ;
- contrôles runtime ;
- validation desktop/mobile si pertinente ;
- smoke test production si nécessaire.

Utiliser Work lorsque l'exécution autonome multi-étapes apporte réellement de la valeur.

---

## Règles générales

1. **Chat d'abord, Work par exception.**  
   Une demande de niveau 0, 1 ou 2 doit normalement être traitée directement dans le chat si les outils disponibles suffisent.  
   Le niveau 3 peut rester dans le chat si le changement et ses tests sont clairement maîtrisés.  
   Le niveau 4 est le candidat naturel pour Work.

2. **Le niveau peut monter après inspection.**  
   Si une modification paraît simple mais révèle une dépendance inattendue, passe au niveau supérieur et explique brièvement pourquoi.  
   Ne continue pas aveuglément pour respecter le niveau initial.

3. **Ne jamais surtester.**  
   Ne lance pas une suite complète de tests lorsqu'un test ciblé apporte déjà la preuve suffisante.  
   Ne refais pas localement exactement ce que la CI exécutera automatiquement sauf si cela réduit réellement le risque.

4. **Regrouper intelligemment.**  
   Lorsque plusieurs petites demandes concernent la même zone et peuvent être validées ensemble, les traiter en lot puis faire un seul contrôle cohérent.

   Exemple : quatre ajustements CSS dans la vue Communes = quatre corrections, un contrôle visuel de la vue, pas quatre cycles complets.

5. **Aucun refactoring opportuniste.**  
   Une petite demande ne doit jamais servir de prétexte à nettoyer, moderniser ou réorganiser du code non concerné.

6. **Vérifier avant d'écrire.**  
   Avant toute modification directe du dépôt, vérifier que l'état ou le commit de référence n'a pas changé.  
   Si le dépôt a évolué de manière inattendue, arrêter plutôt que d'écraser ou de réinterpréter.

7. **La validation doit être proportionnée au risque.**  
   Toujours chercher la preuve minimale suffisante, pas la procédure maximale disponible.

8. **Optimiser également la consommation de calcul.**  
   Préférer une vérification déterministe, une recherche ciblée ou un test précis à une navigation complète, une analyse exhaustive ou une génération IA lorsqu'elles n'apportent pas d'information supplémentaire.

9. **Pour les demandes multi-points, faire un pré-tri visible avant intervention.**  
   Afficher uniquement une ligne compacte du type :

   `1 ⚡ · 2 🟡 · 3 🟢 · 4 🟠 · 5 🟢 · …`

   puis une phrase de plan du type :

   `Plan : 8 changements regroupés en 2 lots simples, 3 tests ciblés, 1 changement fonctionnel isolé. Aucun Work nécessaire sauf anomalie.`

   Ne pas transformer cette qualification en longue analyse préalable.

10. **Qualifier chaque point séparément.**  
    Si la demande contient plusieurs points, déterminer le niveau de chacun, puis regrouper ceux qui peuvent partager la même intervention et la même validation.

11. **Éviter les validations redondantes.**  
    Si un contrôle déterministe prouve déjà le résultat, ne lancer ni navigateur, ni génération, ni inspection supplémentaire sans raison.

12. **Ne pas faire de smoke test de production par automatisme.**  
    Le smoke test production est réservé aux changements où le risque réel le justifie : niveau 4, changement transversal, modification d'architecture, bug runtime ou déploiement sensible.

13. **Ne pas reconstruire tout le projet pour un changement local.**  
    Une modification de niveau 0 ou 1 ne doit pas provoquer un cycle complet de build/test si rien dans le changement ne le nécessite.

14. **Privilégier le diff minimal.**  
    Quand plusieurs solutions sont possibles, choisir celle qui touche le moins de fichiers, le moins de logique et le moins de dépendances, à qualité égale.

15. **En cas d'anomalie, arrêter plutôt qu'improviser.**  
    Si le changement prévu révèle une situation inattendue, une dépendance inconnue, un conflit, un état différent du dépôt ou une nécessité de modifier davantage de code, arrêter et rapporter le problème avant d'élargir le périmètre.

16. **Compte rendu final compact.**  
    Lors du compte rendu final, indiquer simplement le niveau utilisé lorsque cela apporte de la clarté, par exemple :

    `⚡ Niveau 0 — asset remplacé, diff vérifié, aucun test inutile lancé.`

    ou :

    `🟠 Niveau 3 — comportement corrigé, 2 tests ciblés passés, aucun test général lancé.`

    Le compte rendu ne doit pas devenir un journal d'exécution détaillé sauf si une anomalie ou un risque le justifie.

17. **Le but n'est pas de minimiser les contrôles à tout prix.**  
    Le but est de faire exactement autant de contrôle que nécessaire, et pas davantage.

18. **Principe directeur.**  
    Déterministe d'abord. Raisonnement lourd seulement lorsqu'il apporte une information nouvelle ou réduit réellement le risque.

> Une procédure plus lourde n'est pas meilleure parce qu'elle est plus lourde ; elle n'est justifiée que si elle apporte une preuve supplémentaire utile.

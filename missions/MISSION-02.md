# MISSION 02 — Audit métier commande par commande (grille constitution)

**Phase** : pré-requis Phase 5 · **Durée cible** : 1-2 sessions · **Pré-requis** : MISSION-01 close

## Contexte

La constitution (§2) impose de vérifier chaque commande au-delà du scénario nominal. Cet audit
n'a jamais été fait systématiquement. Il DOIT précéder les travaux de fidélité (missions 03-04) :
on ne peaufine pas les messages d'un moteur qui a des bugs d'état. Objectif : zéro bug critique
et zéro incohérence fonctionnelle connus à la fin.

## Méthode

Source de vérité du périmètre : PROJECT_MEMORY §5 (liste des commandes niveau 1-2 garanties).
Pour CHAQUE commande du dispatcher `processCommand` (`packages/core/src/index.js`), dérouler la
grille et noter le résultat dans un tableau `AUDIT-COMMANDES.md` (à créer à la racine) :

**Grille par commande** (CONSTITUTION §2) :
1. Nominal (déjà couvert par les tests golden — vérifier que le test existe vraiment)
2. Réexécution immédiate (2× la même commande — duplication d'état ? ex : SS deux fois sur la
   même ligne AN ne doit JAMAIS dupliquer le segment)
3. Exécution dans le mauvais état (avant PNR, PNR vide, après ER, après IG…) → erreur Amadeus
   correcte, jamais de crash ni d'acceptation silencieuse
4. Arguments limites : vides, trop longs, numéro de ligne inexistant, ville inconnue, date
   passée/invalide, casse mélangée
5. Interaction avec IG/ET/ER : l'état est-il exactement celui attendu après annulation/validation ?
6. Effets secondaires croisés (ex : FXP avant NM ; RF exigé avant ER ; TST après modification
   de segment…)

**Règle d'or (CONSTITUTION §3)** : chaque bug trouvé → chercher immédiatement toute sa famille
avant de le corriger. Correctif + test golden reproduisant le bug, dans le même commit.

## Tâches

1. Créer `AUDIT-COMMANDES.md` : une ligne par commande × colonne par point de grille
   (✅ / ❌ réf bug / ⬜ non applicable).
2. Dérouler l'audit commande par commande, EN ÉCRIVANT des tests golden pour chaque cas limite
   non déjà couvert (même ceux qui passent — ils deviennent des tests de non-régression).
3. Corriger chaque bug critique/incohérence découvert (classification CONSTITUTION §5),
   famille par famille, un commit par famille avec ses tests.
4. Les "améliorations recommandées" et "idées" découvertes vont dans `TASKS.md` Backlog,
   PAS dans le code (CONSTITUTION §5-6).
5. Mettre à jour PROJECT_MEMORY §5 si le périmètre garanti change.

## Critères d'acceptation
- [ ] `AUDIT-COMMANDES.md` complet : 100% des commandes du dispatcher passées à la grille
- [ ] Zéro case ❌ restante (tout bug trouvé est corrigé + testé, ou explicitement reporté dans
      `TASKS.md` avec accord de Massy si non critique)
- [ ] Nombre de tests core en hausse significative (chaque cas limite = un test)
- [ ] Toutes les suites vertes + CI verte
- [ ] Rituel de clôture exécuté (TASKS.md, CLAUDE.md, push)

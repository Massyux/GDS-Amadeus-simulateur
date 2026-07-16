# MISSION 08 — Moteur d'exercices guidés (Phase 6, partie 1)

**Pré-requis** : chaîne d'implémentation close (✅ 07/07/2026). Pilote reporté (décision Massy).
**Durée** : 2-3 sessions. Partie 2 (quiz/notation/progression) = MISSION-09, après celle-ci.

## Vision

L'étudiant choisit un exercice (« Réserve un aller ALG→PAR pour M. Dupont, valide le dossier »),
travaille dans le VRAI terminal (aucune simplification), et le moteur évalue automatiquement
son travail. C'est le produit de formation — le simulateur seul n'était que l'outil.

## Architecture (même philosophie que le core)

- **`packages/exercises`** : nouveau package PUR (zéro UI) —
  `evaluate(exercise, finalState, commandTrace) -> { passed, score, feedback[] }`, testé golden.
- **Format d'un exercice** (JSON dans `packages/exercises/content/`) :
  `id`, `niveau` (1-3), `titre`/`consigne` FR+EN, `seedState` (état initial déterministe),
  `objectifs[]` (critères sur l'ÉTAT FINAL : PNR enregistré, n segments avec statut X, nom
  conforme, TST présent, billet émis…), `jalonsTrace[]` (optionnel : commandes-clés attendues
  dans le parcours, ex. « a utilisé AC plutôt qu'un nouvel AN »), `aides[]` (indices progressifs,
  révélés à la demande, pénalité de score), `bareme`.
- **Principe d'évaluation : par l'état final, pas par la séquence exacte** — deux chemins
  valides différents doivent tous deux réussir (fidèle au vrai métier). Les jalonsTrace ne
  servent qu'aux exercices qui enseignent une commande précise.
- **UI mode exercice** (`apps/web`) : entrée depuis l'accueil (« Mode exercices »), panneau
  consigne repliable au-dessus du terminal (le terminal reste pixel-identique), boutons
  Vérifier / Indice / Abandonner, écran de résultat (réussi/échoué + feedback par objectif).
  FR/EN via le dictionnaire existant. Le mode libre actuel reste l'entrée par défaut.

## Contenu initial : 10 exercices progressifs

1. Lire une disponibilité (AN, MD, AC) — niveau 1
2. Décoder ville et compagnie (DAC, DNA, DC) — niveau 1
3. Première vente (AN → SS → RT) — niveau 1
4. PNR complet (NM, AP, RF, TKTL, ER) — niveau 1
5. Vente directe sans AN (long sell) — niveau 2
6. Retrouver et modifier un dossier (RT locator, SB, ER) — niveau 2
7. Corriger des erreurs (NU, XE, DL, IG à bon escient) — niveau 2
8. Tarifer et émettre (FXP, TTP, TWD) — niveau 2
9. Liste d'attente (SS sur classe pleine, ETK) — niveau 3
10. Dossier de A à Z chronométré (tout combiné) — niveau 3

Chaque exercice : rédigé FR+EN, testé par un golden qui déroule une solution valide ET une
solution alternative valide ET un échec typique.

## Étapes

1. Spec du format JSON + moteur `evaluate` + tests golden (avant toute UI)
2. Exercices 1-4 + UI minimale du mode exercice + e2e (un exercice réussi, un échoué)
3. Exercices 5-10 + indices + barème + polissage FR/EN
4. Rituel de clôture + production vérifiée

## Critères d'acceptation
- [ ] Deux chemins valides différents réussissent le même exercice ; un PNR incomplet échoue
      avec un feedback précis par objectif (jamais un « raté » sec)
- [ ] Le terminal en mode exercice reste strictement identique au mode libre
- [ ] Contenu 100% FR+EN ; 10 exercices jouables en production
- [ ] Suites + e2e verts, rituel de clôture

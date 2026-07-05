# MISSION 03 — Messages d'erreur fidèles Amadeus (Phase 5, suite)

**Phase** : 5 · **Durée cible** : 1 session · **Pré-requis** : MISSION-02 close

## Contexte

Le commit `39818f1` (« Phase 5 Etape 1: differentiate generic INVALID FORMAT error messages »)
a commencé ce chantier. Objectif : que CHAQUE erreur affichée soit celle que le vrai Amadeus
Selling Platform afficherait dans la même situation (texte, casse, format) — c'est le cœur de la
valeur pédagogique (« développer les mêmes réflexes que dans un vrai GDS »).

## Tâches

1. **Inventaire** : extraire tous les messages d'erreur émis par `packages/core` (`git grep` sur
   les chaînes d'erreur du dispatcher et des handlers). Les lister dans un tableau
   `docs/ERREURS-AMADEUS.md` : commande, situation, message actuel, message Amadeus authentique,
   statut (conforme / à corriger / à vérifier).
2. **Référencement** : pour chaque message, documenter le message authentique à partir des
   connaissances Amadeus (manuels de formation publics, HELP pages, conventions connues :
   `INVALID FORMAT`, `NEED PNR`, `NO NAME`, `SECURED PNR`, `SIMULTANEOUS CHANGES TO PNR`, etc.).
   En cas de doute réel : marquer « à vérifier » et demander à Massy (il connaît le vrai Amadeus) —
   ne JAMAIS inventer un message plausible sans le marquer.
3. **Correction** : aligner les messages, un commit par commande ou par famille de messages,
   avec mise à jour des tests golden correspondants (les golden DOIVENT casser puis être mis à
   jour — si un golden ne casse pas, c'est que le cas n'était pas testé : ajouter le test).
4. **Cohérence transverse** : même situation = même message partout (ex : PNR requis → un seul
   libellé, dans toutes les commandes qui l'exigent).
5. Mettre à jour PROJECT_MEMORY (règles messages) et le tableau `docs/ERREURS-AMADEUS.md`.

## Critères d'acceptation
- [ ] `docs/ERREURS-AMADEUS.md` exhaustif, zéro ligne « à corriger » restante
- [ ] Les lignes « à vérifier » sont listées en fin de session pour arbitrage Massy
- [ ] Chaque message modifié est couvert par au moins un test golden
- [ ] Toutes les suites vertes + CI verte, rituel de clôture exécuté

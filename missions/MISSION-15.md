# MISSION 15 — Servicing du PNR actif + famille transactionnelle

**Chaîne d'implémentation, maillon 1/7** · Détail des commandes : `docs/COMMANDES-MANQUANTES.md`

## ÉTAPE 0 — BUG CRITIQUE SIGNALÉ PAR MASSY (à faire avant tout)

**« IG ne sort pas complètement du PNR et ne l'ignore pas. »** (06/07/2026, test réel de Massy)

Revoir TOUTE la logique transactionnelle (CONSTITUTION §3 — famille complète, pas un patch) :

1. Écrire d'abord la **matrice d'états attendue** (la documenter dans PROJECT_MEMORY §2) :
   - `IG` sur PNR jamais enregistré → le PNR disparaît TOTALEMENT (passagers, segments,
     contacts, TST, tout) ; l'inventaire vendu est restitué ; `RT` ensuite → erreur « pas de PNR »
   - `IG` sur PNR enregistré modifié → les modifications sont jetées, le PNR revient EXACTEMENT
     à son dernier état enregistré (pas de résidu des modifs, pas de perte de l'enregistré)
   - `IR` → comme IG + réaffichage de l'état restauré
   - `ER`/`ET` → enregistrent ; `ET` NE réaffiche PAS (c'est l'écart de fidélité déjà identifié :
     ET n'est pas une commande d'émission — la corriger ici)
   - `XI` → annule tout l'itinéraire (mais pas les autres éléments) — vérifier sa place exacte
   - Après chaque transition : que valent `lastAN`, TST, inventaire ? Zéro état fantôme.
2. Reproduire le bug de Massy par un test golden AVANT de corriger (le test doit être rouge).
3. Corriger, dérouler la matrice complète en tests golden (chaque case = un test).
4. Chercher les cousins : toute commande qui lit `activePNR` après un IG doit être testée.

## Commandes à implémenter ensuite (une par une, jamais deux en parallèle)

Dans cet ordre (voir rôles/logiques dans docs/COMMANDES-MANQUANTES.md §Priorité 1) :

1. Correction fidélité `VOID` → flux `TWD` (afficher billet) + `TWX` (annuler) — logique existante
   conservée, entrées conformes ; `VOID` retiré du dispatcher
2. `SS` vente directe (long sell) `SS<vol><classe><date><villes><n>`
3. `SB` rebooking (classe / date / n° de vol, un segment ou tous)
4. Modification par numéro d'élément (`5/TEXTE`, `8/12JUL`, `4/2`) — transverse, bien spécifier
   quels types d'éléments sont modifiables et les erreurs pour les autres
5. `NU` correction de nom (+ règle après émission : refus)
6. `DL` suppression d'élément (vs XE : documenter la différence dans PROJECT_MEMORY)
7. `SI ARNK` segment de continuité
8. `TKOK` / `TKXL` (compléter la famille TK avec TKTL existant — un seul élément TK par PNR)

## Protocole de non-régression (OBLIGATOIRE, demandé par Massy)

Après CHAQUE commande implémentée (pas à la fin de la mission) :
- suite core complète + typecheck + lint → 100% vert sinon on répare avant d'avancer
- grille CONSTITUTION §2 déroulée sur la nouvelle commande (réexécution, mauvais état,
  limites, interaction IG/ER — ajoutée à `AUDIT-COMMANDES.md`)
- un commit par commande, message clair, push (CI = 2e filet)

À la fin de la mission : les 6 suites (core/data/web Vitest/e2e/lint/typecheck) + production
vérifiée + rituel de clôture + **enchaîner immédiatement sur MISSION-16** (voir protocole de
chaîne dans missions/README.md).

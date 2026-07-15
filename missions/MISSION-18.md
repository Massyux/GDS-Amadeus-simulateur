# MISSION 18 — Sièges : SM / ST / SX

> **MISSION ENTIÈREMENT REPORTÉE EN V2 (décision Massy, 07/07/2026)** — ne pas exécuter.
> Dans la chaîne, MISSION-13 enchaîne directement sur MISSION-19.

**Chaîne d'implémentation, maillon 5/7** · Détail : `docs/COMMANDES-MANQUANTES.md` §Priorité 3

1. **Modèle de carte de sièges** dans le provider sim (packages/data ou provider dédié) :
   déterministe par vol/date/classe (configuration cabine par type d'appareil, sièges occupés
   générés par règle stable — jamais d'aléatoire non contrôlé).
2. `SM` — afficher le plan de cabine : `SM` (itinéraire mono-segment), `SM4` (segment),
   `SM LH330/Y/FRAJFK` (vol direct) — rendu texte fidèle Amadeus (rangées, allées, légende).
3. `ST` — demande de siège : `ST/12C/P2/S5`, plages `ST/12A-D/S5`, préférence `ST/W` —
   crée l'élément SEAT dans le PNR, contrôle « siège déjà pris » (jamais de double attribution
   — c'est l'exemple canonique de la constitution), « siège inexistant », « mauvaise classe ».
4. `SX` / `XE<n>` — annulation des sièges (tous / par segment / par élément) ; le siège
   redevient libre (vérifier via SM).
5. Interactions : SB (rebooking) invalide les sièges du segment rebooké ; IG restitue les
   sièges pris pendant la transaction ; ER les fige.

Tests golden : double sélection du même siège (2 PNR successifs), re-sélection par le même
PNR, annulation puis reprise, sièges après SB/IG/ER.
Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-19.

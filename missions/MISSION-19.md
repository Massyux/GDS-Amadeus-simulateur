# MISSION 19 — PNR enregistrés & multi-PNR

**Chaîne d'implémentation, maillon 6/7** · Détail : `docs/COMMANDES-MANQUANTES.md` §Priorité 3

> **PÉRIMÈTRE RÉDUIT (triage Massy 07/07/2026)** : implémenter UNIQUEMENT les étapes 1 à 3
> (magasin de PNR, RT par locator, RT par nom avec liste de similitude). Les étapes 4-6
> (RH, SP/EF/RTAXR, RRN/RRI/RRP) sont reportées en v2. Après cette mission → MISSION-07
> (pilote), la mission 20 est entièrement reportée.

C'est le maillon le plus structurant : le simulateur passe de « un PNR actif » à « un vrai
fichier de réservations » (persistant dans la session de travail via packages/data ; la
persistance navigateur/localStorage est un choix à valider avec Massy en début de session).

1. **Magasin de PNR** dans packages/data : ER/ET y écrivent, clé = record locator. Définir la
   sérialisation complète (passagers, segments+statuts, éléments, TST, sièges).
2. `RT <locator>` — récupérer un PNR enregistré (le charge comme PNR actif « retrieved » —
   la matrice transactionnelle de M15 s'applique : IG jette les modifs, pas le PNR).
3. `RT/<nom>` et `RT <vol>/<date>-<nom>` — recherche par nom (liste de similitude si plusieurs,
   sélection `RT <n>`, retour liste `RT 0`).
4. `RH` — historique du PNR : journaliser chaque transaction enregistrée (s'appuyer sur
   l'events flow existant) ; `RH` complet d'abord, filtres (`RH N`, `RH I`…) ensuite.
5. `SP` — scinder des passagers vers un PNR associé + `EF` (filer l'associé) + lien `RTAXR` ;
   les éléments suivent les bons passagers, aucun élément orphelin.
6. `RRN` / `RRI` / `RRP` — copie du PNR (complet / itinéraire seul / passagers seuls) avec
   options (`/DP7`, `/CY`, `/P2-4`) — la copie re-vend l'inventaire (pas de clone de sièges).

Tests golden : cycle complet enregistrer→quitter→récupérer→modifier→IG→récupérer ;
split avec TST et sièges ; copie avec inventaire décrémenté ; collisions de record locator.
Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-20.

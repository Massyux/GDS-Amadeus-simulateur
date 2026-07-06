# MISSION 16 — Navigation & affichages

**Chaîne d'implémentation, maillon 2/7** · Détail : `docs/COMMANDES-MANQUANTES.md` §Priorité 1

## Principe d'architecture

La pagination et le « dernier affichage » sont un état du CORE (`state.lastDisplay` : type,
critères, position), pas de l'UI — l'UI ne fait que rendre les events. Spécifier ce modèle
d'abord, le faire valider par les tests, puis brancher les commandes dessus.

## Commandes (une par une, protocole de non-régression de MISSION-15 §Protocole)

1. `MD` / `MU` / `MT` / `MB` — défiler l'affichage courant (AN long, RT long, TN…)
2. `MN` / `MY` — même disponibilité au jour suivant / précédent (relance le dernier AN décalé)
3. `AC` — modifier le dernier affichage dispo : date (`AC18MAY`), heure (`AC1845`), classe
   (`AC/CF`), villes (`ACBCNFRA`), delta jours (`AC3`, `AC-5`) ; `SC` équivalent pour SN
4. `ACR` — vols retour du dernier affichage
5. `RT` partiels : `RTN`, `RTI`, `RTA`, `RTK`, `RTG`, `RTR`, `RTF` (filtres du PNR actif)
6. `RE` / `RE2` — rappel des dernières entrées (état core : historique de saisie)

## Points de vigilance famille (leçon mission 04)

Aucun de ces préfixes ne doit intercepter d'autres commandes : `MD` vs un futur `DM`, `RE` vs
`RF`… — tests golden de non-collision sur le dispatcher pour CHAQUE nouveau préfixe.

Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-17.

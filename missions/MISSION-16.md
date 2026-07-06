# MISSION 16 — Navigation & affichages

**Chaîne d'implémentation, maillon 2/7** · Détail : `docs/COMMANDES-MANQUANTES.md` §Priorité 1

## ÉTAPE 0 — reliquat arbitré de M15 (accord architecte 06/07/2026)

Correction fidélité `ET` : doit se comporter comme `ER` **sans réafficher le PNR** (fin de
transaction, enregistre, affiche uniquement la confirmation/record locator) et ne doit PAS
émettre de billet (l'émission reste `TTP` seul). Mettre à jour tests golden + docs + retirer
la ligne correspondante du Backlog TASKS.md et du tableau d'écarts de COMMANDES-MANQUANTES.md.

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

## Spec AC / SC / ACR (arbitrée par l'architecte, 06/07/2026 — source : guide §Air, Change Entries)

Principe : `AC` rejoue la **dernière recherche de disponibilité** en ne changeant QUE le delta
indiqué ; tous les autres critères sont conservés ; le résultat réalimente `lastAN`/
`lastDisplay` (donc chaînable : `AC18MAY` puis `AC/CF` puis `MN`…). `SC` = identique pour
l'affichage schedule (SN). Erreur `NO ACTIVE DISPLAY` si aucune recherche préalable.

Ordre de désambiguïsation du parsing (déterministe, dans cet ordre) :
1. Commence par `R` → **ACR** (retour) : villes inversées ; `ACR` seul = jour d'arrivée,
   départs après 18h00 ; `ACR1345` = heure indiquée ; `ACR24JUL2130` = date + heure
2. Commence par `/` → option :
   - `/A<XX>[,YY,ZZ]` filtre compagnies (max 3) — `AC/ALH,IB`
   - `/C<lettre(s)>` filtre classes (max 3) — `AC/CF` = classe F ; `/C` seul = annule le filtre
   - `/B<n>` nombre de sièges — `AC/B4`
3. `//` + 3 lettres → changer la destination seule (`AC//FRA`)
4. 6 lettres → nouvelle paire de villes (`ACBCNFRA`) ; 3 lettres → nouvelle origine (`ACBCN`)
5. Motif `ddMMM` → nouvelle date (`AC18MAY`)
6. 4 chiffres → nouvelle heure de départ (`AC1845`)
7. 1-2 chiffres signés → décalage en jours (`AC3`, `AC-5`)
8. Sinon → `CHECK FORMAT`

Erreurs réutilisées : `NOT IN TABLE` (ville inconnue), `CHECK DATE`, `CHECK CLASS OF SERVICE`.
Point marqué « à vérifier terrain » (Massy) : comportement exact quand on tape `AC` après un
affichage schedule (le guide distingue AC=dispo / SC=schedule ; implémenter : chaque commande
produit son type d'affichage à partir de la même dernière recherche).

## Points de vigilance famille (leçon mission 04)

Aucun de ces préfixes ne doit intercepter d'autres commandes : `MD` vs un futur `DM`, `RE` vs
`RF`… — tests golden de non-collision sur le dispatcher pour CHAQUE nouveau préfixe.

Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-17.

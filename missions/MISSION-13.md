# MISSION 13 — Statuts de segment & liste d'attente (HL/UC/KK/KL) + ETK/ERK

**Chaîne d'implémentation, maillon 4/7** · Origine : écart business confirmé par Massy
(mission 03) — le vrai Amadeus met en liste d'attente au lieu de refuser la vente.

## Spec à faire valider par Massy en début de session

1. Modèle de statuts de segment : HK (confirmé), HL (waitlist demandée), KK/KL (confirmés par
   la compagnie, à entériner), UC/UN/NO (rejetés), et transitions autorisées entre eux.
2. **Règle déterministe de simulation** (produit offline, exercices reproductibles) — proposer :
   une place se libère (XE d'un autre segment simulé/PNR sur le même vol) → le premier HL du
   vol passe KL. Pas d'aléatoire. Massy valide ou amende.

## Implémentation

1. Statut porté par chaque segment + affiché dans RT au format Amadeus exact
2. `SS` avec classe pleine → segment `HL` (au lieu du refus actuel `NO SEATS`) ; garder le refus
   sec uniquement là où le vrai Amadeus refuse vraiment
3. `SS…PE` — demande de liste d'attente explicite
4. `ETK` / `ERK` — fin de transaction en traitant les codes-conseil : KK/KL→HK,
   UC/UN/NO→retirés (historisés quand RH existera — mission 19)
5. Modification de statut par n° d'élément (`2/HK`, `2/HL`) — s'appuie sur le transverse de M15
6. Mettre à jour la matrice transactionnelle de M15 (IG doit restituer correctement les places
   des HL/KK aussi) et PROJECT_MEMORY §2

Tests golden : chaque transition de la matrice de statuts + interactions IG/ER/XE/SB.
Clôture : 6 suites vertes + rituel + enchaîner sur MISSION-18.

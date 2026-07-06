# MISSION 20 — Tarifs & billetterie complets (v2)

**Chaîne d'implémentation, maillon 7/7 — dernier avant retour au pilote (mission 07)**

Pré-requis : recouper avec les sections Fares/Pricing (p.125+) et Ticketing (p.153+) des
manuels de `D:\cowork\references-amadeus\` (les télécharger si pas encore fait — voir
`docs/REFERENCES-AMADEUS.md`) : l'extrait lu par l'architecte s'arrêtait avant ces sections.

Périmètre (affiner avec les manuels + Massy en début de session) :

1. `FQD` — affichage des tarifs par ville-paire (grille de tarifs sim déterministe, bases
   tarifaires, compagnies) + `FQN` réaligné sur son vrai rôle (notes/règles d'une ligne FQD)
2. `FQP` — cotation d'un itinéraire sans PNR
3. Famille TST complète : `TTE` (suppression), `TTI`, `TTK`, multi-TST par types de passagers
   (ADT/CHD/INF ont des TST distincts)
4. `TTP` avec options réelles (`TTP/RT`, `TTP/T1`, par passager `/P1`)
5. `TWD` / `TWX` — déjà en place depuis M15 ; compléter (TWD/L<n>, historique billet)
6. `TRF` — remboursement (simple en v2 : full refund, les pénalités attendront)
7. `ITR` — compléter (impression/affichage, pas seulement EML)

Chaque commande : grille constitution + tests golden + non-régression complète (protocole
M15). Clôture : 6 suites + e2e mis à jour + rituel + **bilan de chaîne** : réponse écrite à la
question finale de la constitution sur l'ensemble, puis GO mission 07 (pilote) avec le
simulateur complet.

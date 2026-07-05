# AUDIT-COMMANDES — Audit métier commande par commande

> Mission 02 (`missions/MISSION-02.md`). Grille CONSTITUTION §2 appliquée à chaque commande du
> dispatcher `processCommand` (`packages/core/src/index.js`). Légende : ✅ conforme/couvert par
> test · ❌N bug trouvé (voir note N) · ⬜ non applicable · 🟡 point de fidélité incertain, à
> vérifier avec Massy (non deviné, non corrigé sans son accord).
>
> Grille : 1) Nominal · 2) Réexécution immédiate · 3) Mauvais état · 4) Arguments limites ·
> 5) Interaction IG/ET/ER · 6) Effets secondaires croisés

## Grille

| Commande | 1 Nominal | 2 Réexéc. | 3 Mauvais état | 4 Limites | 5 IG/ER | 6 Croisés |
|---|---|---|---|---|---|---|
| HE / HELP | ✅ | ⬜ | ⬜ | ✅ (`HE <inconnu>`→HELP NOT FOUND) | ⬜ | ⬜ |
| JD | ✅ | ✅ (pur, sans état) | ⬜ | ⬜ | ⬜ | ⬜ |
| DAC / DAN | ✅ | ✅ (pur) | ✅ (provider absent) | ✅ (format), 🟡 (voir note DATA-1) | ⬜ | ⬜ |
| AN | ✅ | ✅ (nouvelle recherche remplace `lastAN`) | ⬜ | ✅ format/date, 🟡 (note DATA-1 : accepte tout code 3 lettres) | ⬜ | ✅ (alimente SS) |
| TN / SN | ✅ | ✅ (pur) | ⬜ | ✅ format/date | ⬜ | ⬜ |
| SS | ✅ | ❌1 **corrigé** : décrément de sièges ajouté (survente/duplication) | ✅ (NO AVAILABILITY sans AN) | ✅ ligne/classe inconnue (NOT IN TABLE/CHECK CLASS OF SERVICE) | ⬜ | ✅ crée PNR si besoin |
| XE / XE1 / XE1-2 / XEALL | ✅ | ✅ (déjà annulé → erreur dédiée) | ✅ (NO ACTIVE PNR) | ✅ (index hors bornes) | ✅ | ✅ (bloqué si TST/dernier segment/dernier ADT/INF associé) |
| NM | ✅ | ✅ (multi-pax autorisé, cohérent) | ⬜ (auto-crée le PNR) | ✅ **NM-1 corrigé** (confirmé par Massy) : apostrophe/tiret acceptés (`O'BRIEN`, `JEAN-PIERRE`) | ⬜ | ⬜ |
| AP | ✅ | ✅ (additif, normal) | ⬜ | ❌2 **corrigé** : payload vide rejeté (CHECK FORMAT), aligné sur RM/OP/etc. | ⬜ | ⬜ |
| APE | ✅ | ✅ | ⬜ | ✅ (regex email) | ⬜ | ⬜ |
| SSR | ✅ | ✅ | ⬜ | ✅ (format) | ⬜ | ⬜ |
| OSI | ✅ | ✅ | ⬜ | ✅ (format) | ⬜ | ⬜ |
| RM | ✅ | ✅ | ⬜ | ✅ (vide rejeté) | ⬜ | ⬜ |
| OP | ✅ | ✅ | ⬜ | ✅ (date/format) | ⬜ | ⬜ |
| RF | ✅ | ✅ (écrase, correct) | ⬜ | ✅ (vide, `RF+` rejeté) | ⬜ | ✅ (exigé par ER) |
| TKTL | ✅ | ✅ (écrase) | ⬜ | ✅ (date) | ⬜ | ⬜ |
| FP | ✅ | ✅ (écrase) | ⬜ | ✅ (CASH/CC regex) | ⬜ | ✅ (exigé par ET/TTP) |
| ER | ✅ | ✅ (locator stable) | ✅ (NO ACTIVE PNR, END PNR FIRST si NM/AP/RF manquant) | ⬜ | ✅ | ✅ (valide les TST CREATED→VALIDATED) |
| RT | ✅ | ✅ (pur) | ✅ (NO ACTIVE PNR) | ⬜ | ✅ | ⬜ |
| IG | ✅ | ✅ | ✅ (NO RECORDED PNR si rien à annuler) | ⬜ | ✅ (bug 3 corrigé 03/07) | ⬜ |
| IR | ✅ | ✅ | ✅ (PNR NOT FOUND / NO RECORDED PNR distincts) | ✅ (locator format) | ✅ | ⬜ |
| XI | ✅ | ✅ (RT vide si déjà rien) | ⬜ | ✅ (variantes XIn rejetées) | ✅ (garde le recorded en store) | ⬜ |
| QP/QD/QE/QN/QR/QS | ✅ | ✅ (idempotent QS, QE) | ✅ (NO RECORDED PNR, NO ACTIVE QUEUE, QUEUE NOT FOUND) | ✅ (format id) | ⬜ | ⬜ |
| FXP | ✅ | ✅ (update en place, pas de doublon TST) | ✅ (NO ITINERARY) | ⬜ | ✅ | ❌3 **tarife sans aucun NM dans le PNR** |
| FXR | ✅ | ✅ | ✅ (NO ITINERARY) | ⬜ | ✅ | ❌3 (même famille que FXP) |
| FXB | ✅ | ✅ | ✅ (NO ITINERARY) | ⬜ | ✅ | ❌3 (même famille que FXP) |
| FXX | ✅ | ✅ (STORED stable) | ✅ (NO ITINERARY/NO TST) | ⬜ | ✅ | ⬜ (FXX ne crée pas de TST, ne tarife pas sans TST existant) |
| FXL | ✅ | ✅ (pur affichage) | ✅ (NO TST) | ✅ (`/` → FUNCTION NOT APPLICABLE) | ⬜ | ⬜ |
| TQT | ✅ | ✅ (pur) | ✅ (NO TST) | ✅ (id inconnu → NO TST) | ⬜ | ⬜ |
| FQN | ✅ | ✅ (pur) | ✅ (NO TST) | ✅ (index hors bornes → fallback 1er) | ⬜ | ⬜ |
| ET / TTP | ✅ | ✅ (TICKET ALREADY ISSUED) | ✅ (NO ITINERARY/NO TST/NO FORM OF PAYMENT) | ⬜ | ⬜ | ✅ (dépend TST+FP) |
| VOID | ✅ | ❌4 **corrigé** : re-VOID d'un billet déjà void par numéro exact → `NOTHING TO CANCEL` | ✅ (NO TICKET) | ✅ (format numéro billet) | ⬜ | ✅ (dévalide le TST lié si plus aucun billet actif dessus) |
| ITR-EML | ✅ | ✅ (renvoi multiple = cas réel légitime) | ✅ (NO TICKET/NO EMAIL ADDRESS) | ✅ (`ITR-EML` strict) | ⬜ | ⬜ |

## Notes détaillées

### ❌1 — SS : aucun décrément de sièges (bug critique, famille CONSTITUTION §3)
`handleSS` ne modifie jamais `cls.seats` dans `state.lastAN.results` après une vente. Conséquence :
`SS1Y1` répété N fois crée N segments identiques sans jamais épuiser l'inventaire affiché par AN
(`NO SEATS`/`NOT ENOUGH SEATS` ne se déclenchent jamais si on reste sous le total initial affiché,
et rien n'empêche de dépasser ce total non plus). C'est exactement l'exemple donné par la mission
et par CONSTITUTION §3. **Corrigé** : décrément de `paxCount` sur la classe vendue à chaque SS
réussi. Cancellation (XE) ne restaure PAS l'inventaire (choix assumé, voir note 🟡 ci-dessous).

### ❌2 — AP : aucune validation de format
Seule commande de construction PNR sans aucun garde-fou (RM/OP/RF/TKTL/FP/SSR/OSI/APE rejettent
tous un payload vide). `AP` seul (payload vide) était accepté silencieusement. **Corrigé** :
payload vide → `CHECK FORMAT`, aligné sur le pattern de RM. Format téléphone détaillé (préfixe
ville, etc.) non deviné — 🟡 voir Backlog.

### ❌3 — FXP/FXR/FXB tarifient sans aucun NM dans le PNR
Seule la présence d'un itinéraire est vérifiée (`NO ITINERARY`), jamais celle d'un passager.
`buildPricingData` utilise `inferPaxCounts` qui devine un compte passager à partir de l'itinéraire
quand `passengers` est vide — le mécanisme tolère explicitement l'absence de NM. Déjà signalé et
sa correction demandée explicitement (session précédente, "Bug 5") : tarifer sans nom n'est pas
réaliste. **Corrigé** : nouvelle erreur `NO NAME` si `pnr.passengers.length === 0`, sur FXP/FXR/FXB.

### ❌4 — VOID : re-void silencieux d'un billet déjà annulé si le numéro est fourni explicitement
Sans numéro, le code cherche le dernier billet **non-void** (`item.status !== "VOID"`) — correct.
Avec un numéro explicite, il cherche le billet par numéro sans filtrer son statut : si ce billet
précis est déjà `VOID`, la commande le "revoid" silencieusement et réaffiche `TICKET VOIDED`
comme si une action venait d'avoir lieu. **Corrigé** : billet déjà void + numéro explicite →
`NOTHING TO CANCEL`.

### ✅ NM-1 — Noms avec apostrophe/tiret rejetés (corrigé, confirmé par Massy)
`parseNmAdultEntries` utilisait `^([A-Z]+)\/([A-Z]+)$` pour nom/prénom : n'acceptait ni apostrophe
ni tiret. Exemples qui échouaient avec `CHECK FORMAT` alors que ce sont des cas valides en usage
réel : `NM1O'BRIEN/JOHN MR`, `NM1JEAN-PIERRE/MARTIN MR`, `NM1SAINT-JEAN/MARIE-CLAIRE MRS`.

Repris de la session précédente (Bug 4, jamais tranché). Confirmé par Massy dans cette mission —
classe de caractères étendue à `[A-Z'-]+` dans `parseNmAdultEntries`, `chdMatch` et `infMatch`.

### 🟡 DATA-1 — AN/TN/SN acceptent n'importe quel code ville à 3 lettres
Aucune commande de disponibilité ne consulte `deps.locations` (la vraie table de lieux) : un code
syntaxiquement valide mais inexistant (ex. `ANDECZZZXXX`) génère quand même de faux vols
déterministes via `buildOfflineAvailability`. Le vrai Amadeus renverrait `NOT IN TABLE`/
`CHECK CITY CODE`. Corriger correctement nécessite de coupler `packages/core` à `packages/data`
(hors périmètre d'un correctif contenu à un seul fichier) — **non traité dans cette mission**,
reporté en Backlog pour une mission dédiée.

## Hors périmètre (non couvert par ce dispatcher)
`RH` (historique PNR) n'existe pas dans le simulateur — déjà noté hors scope niveau 1-2 dans
`FIDELITE_AMADEUS_COMPARAISON.md`.

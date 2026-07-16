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
| DAC / DAN | ✅ | ✅ (pur) | ✅ (provider absent) | ✅ (format), ✅ (note DATA-1 corrigée en Mission 03) | ⬜ | ⬜ |
| AN | ✅ | ✅ (nouvelle recherche remplace `lastAN`) | ⬜ | ✅ format/date/ville — **DATA-1 corrigé en Mission 03** : code ville inconnu → `NOT IN TABLE` (si `deps.locations` configuré) | ⬜ | ✅ (alimente SS) |
| TN / SN | ✅ | ✅ (pur, régénère `state.lastDisplay` à chaque appel) | ⬜ | ✅ format/date/ville (idem AN, Mission 03) | ⬜ | ✅ alimente `state.lastDisplay` (Mission 16 Étape 1, pagination réelle page par page) |
| MD / MU / MT / MB (**ajoutées Mission 16 Étape 1**) | ✅ (borne haute/basse/haut/bas) | ✅ (idempotent aux bornes, clamp) | ✅ (`NO ACTIVE DISPLAY` si rien de paginé) | ⬜ | ⬜ | ✅ correspondance exacte, aucune collision avec un futur préfixe (ex. `DM`) — testé |
| MN / MY (**ajoutées Mission 16 Étape 2**) | ✅ (relance AN décalé +1/-1 jour) | ✅ (chaînable, `MN` `MN` = +2 jours) | ✅ (`NO ACTIVE DISPLAY` sans recherche préalable) | ⬜ | ⬜ | ✅ fonctionne même si le dernier affichage était TN/SN (même `state.lastAN`) ; résultat reste vendable via SS |
| AC / SC / ACR (**ajoutées Mission 16 Étape 3**, spec architecte 8 règles) | ✅ (date, delta jours, villes ×3 formes, compagnie, classe, sièges, heure) | ✅ (chaînable — filtres conservés d'un appel à l'autre) | ✅ (`NO ACTIVE DISPLAY` sans recherche préalable) | ✅ (`CHECK FORMAT` fallback, `CHECK DATE`, `CHECK CLASS OF SERVICE` sur lettre de classe invalide) | ⬜ | ✅ `AC` toujours en style AN / `SC` toujours en style SN quel que soit le dernier affichage réel ; résultat vendable via SS, chaînable avec MD/MU/MT/MB |
| RE / REn (**ajoutée Mission 16 Étape 6**) | ✅ (rappelle et ré-exécute la dernière entrée) | ✅ (`RE` répété rappelle toujours la même entrée d'origine, `RE` n'est jamais lui-même enregistré) | ✅ (`NO PREVIOUS ENTRY` si historique vide ou trop court, ex. `RE3` avec 1 seule entrée) | ✅ (`REn` avec n=2 chiffres max, `RE(\d{1,2})?` — non deviné au-delà de la généralisation naturelle de `RE`/`RE2`) | ⬜ | ✅ non-collision testée avec `RF` ; non-collision dispatcher confirmée pour les futurs `RT` partiels (`RTN`/`RT ABC123`/`RTZZ` → `CHECK FORMAT`, reportés en v2) |
| DD (**ajoutée Mission 17, périmètre réduit**) | ✅ (`DDddMMM`, `DDddMMM/±n`, `DD±n` — date + jour de semaine) | ✅ (pur calcul, sans état, ré-exécutable à l'identique) | ⬜ | ✅ (`CHECK DATE` sur date invalide type `DD31FEB` ; `DDPAR` ville seule ne matche aucune forme → `CHECK FORMAT`, cohérent avec "aucune donnée externe") | ⬜ | 🟡 wording exact (`FROM`/`TO`) non confirmé avec Massy — logique de calcul fiable, formulation à vérifier terrain |
| DC (**ajoutée Mission 17, périmètre réduit**) | ✅ (decode par code 2 lettres, encode par recherche texte, ex. `DC FRANCE`/`DC GB`) | ✅ (pur lookup, sans état) | ✅ (`COUNTRY PROVIDER NOT CONFIGURED` si `deps.countries` absent) | ✅ (`NO MATCH` si aucune correspondance) | ⬜ | ✅ même dualité encode/decode que DAC/DAN, nouvelle table `packages/data` (`countries.json`) |
| DNA (**ajoutée Mission 17, périmètre réduit**) | ✅ (nom, code 2 lettres, ou code numérique — ex. `DNA DELTA`/`DNA AF`/`DNA 057`) | ✅ (pur lookup, sans état) | ✅ (`AIRLINE PROVIDER NOT CONFIGURED` si `deps.airlines` absent) | ✅ (`NO MATCH` si aucune correspondance) | ⬜ | ✅ table `packages/data` (`airlines.json`) cohérente avec les compagnies déjà utilisées par le provider AN (AH/AF/TK/PC/SV/AT) |
| SS / SS long sell — waitlist (**ajoutée Mission 13**) | ✅ (classe pleine → `HL` au lieu du refus ; `...PE` force le waitlist même si des sièges restent) | ✅ (pas de décrément pour `HL`, cohérent d'un appel à l'autre) | ✅ (`NO AVAILABILITY`/`NOT IN TABLE` inchangés) | ✅ (`NOT ENOUGH SEATS` conservé pour le vrai refus : sièges partiels insuffisants) | ⬜ | ✅ long sell corrigé au passage pour réutiliser `state.lastAN` comme SB (sinon un 2e long sell sur le même vol écrasait l'inventaire déjà entamé) |
| XE / DL — libération + promotion waitlist (**ajoutée Mission 13**) | ✅ (`XE`/`DL` libèrent l'inventaire, ❌ bug corrigé : `XE` ne le faisait jamais avant cette mission) | ✅ (idempotent — un statut `HL`/`UC`/`UN`/`NO` ne libère rien, jamais tenu) | ⬜ | ✅ (promotion FIFO gatée par la disponibilité réelle de la classe du `HL` — testé : pas de promotion inter-classes) | ✅ (IG/IR/XI bénéficient du même correctif via `segmentHoldsInventory` partagé) | ✅ non-collision testée : le vol entier est cherché (choix Massy 07/07/2026) mais la promotion elle-même reste gatée par classe |
| ETK / ERK (**ajoutée Mission 13**) | ✅ (KK/KL→HK, UC/UN/NO supprimés, comme ER/ET pour le reste) | ✅ (idempotent, mêmes garanties que ER/ET) | ✅ (`NO ACTIVE PNR`/`END PNR FIRST` réutilisés via `recordPnr`) | ⬜ | ✅ testé explicitement | ✅ non-collision testée avec `ET`/`ER` seuls (égalité stricte, jamais interceptés par erreur) |
| n/HK\|HL\|KK\|KL\|UC\|UN\|NO (**ajoutée Mission 13**) | ✅ (override manuel du statut d'un segment par n° d'élément RT) | ✅ (idempotent) | ✅ (`ELEMENT NOT FOUND` sur segment déjà annulé, `NOT ALLOWED - TST SEGMENT` si verrouillé par un TST) | ✅ (`NO SEATS` si la classe cible n'a plus de siège, `NOT ALLOWED` pour une valeur non reconnue) | ⬜ | ✅ cohérence d'inventaire maintenue à chaque transition (libère en sortant d'un statut tenu, consomme en y entrant) |
| SS (numérique, depuis AN) | ✅ | ❌1 **corrigé** : décrément de sièges ajouté (survente/duplication) | ✅ (NO AVAILABILITY sans AN) | ✅ ligne/classe inconnue (NOT IN TABLE/CHECK CLASS OF SERVICE) | ⬜ | ✅ crée PNR si besoin |
| SS (long sell, **ajouté Mission 15**) | ✅ | ✅ (décrémente `state.lastAN` régénéré à l'identique, pas de survente) | ✅ (aucun état requis, remplace `lastAN` comme AN) | ✅ vol/ville inconnu (NOT IN TABLE), classe fermée, date invalide, format | ✅ (restitution testée, même famille que SS numérique) | ✅ alimente `state.lastAN` (implicite AN), crée PNR si besoin |
| SB (**ajouté Mission 15**) 🟡 syntaxe à confirmer | ✅ (3 modes : classe/date/vol) | ✅ (ancien segment HX, nouveau HK, pas de doublon actif) | ✅ (NO ACTIVE PNR, ELEMENT NOT FOUND si n'existe pas/n'est pas un segment/déjà annulé) | ✅ vol/ville inconnu, classe fermée, date invalide, format | ✅ (bloqué par `NOT ALLOWED - TST SEGMENT`, même règle que XE) | ✅ referme le cycle inventaire (réutilise `state.lastAN` si même contexte, sinon re-fetch sans écraser les autres sièges déjà vendus) |
| Modification par n° (`n/valeur`, **ajouté Mission 15**, périmètre réduit — voir `docs/COMMANDES-MANQUANTES.md`) | ✅ (RM/OSI/SSR/OP texte, OP/TKTL date) | ✅ (écrase la valeur précédente, pas d'accumulation) | ✅ (NO ACTIVE PNR, ELEMENT NOT FOUND) | ✅ (CHECK FORMAT si valeur vide, CHECK DATE si date invalide) | ⬜ | ✅ `NOT ALLOWED` pour tout type d'élément non pris en charge (PAX, SEG, AP, FP, RF, billet) — pas de tentative de deviner une grammaire |
| NU (**ajouté Mission 15**) | ✅ | ✅ (écrase nom précédent) | ✅ (NO ACTIVE PNR, ELEMENT NOT FOUND) | ✅ (CHECK FORMAT si les deux positions ne correspondent pas) | ✅ (bloqué par `NOT ALLOWED` si un billet est émis, non-VOID) | ⬜ |
| DL (**ajouté Mission 15**, scope segments — voir `docs/COMMANDES-MANQUANTES.md`) | ✅ (suppression réelle, pas de résidu `HX`) | ✅ (numérotation RT recalculée au prochain affichage) | ✅ (NO ACTIVE PNR, ELEMENT NOT FOUND) | ✅ (CHECK FORMAT) | ✅ (mêmes garde-fous que XE : `NOT ALLOWED - TST SEGMENT`, `NOT ALLOWED - LAST SEGMENT`) | ✅ restitue l'inventaire (même helper que IG/SB/XI) ; `NOT ALLOWED` pour tout élément non-segment (déjà réellement supprimé par XE) |
| SI ARNK (**ajouté Mission 15**) | ✅ | ✅ (chaque `SI ARNK` ajoute une nouvelle entrée neutre) | ⬜ (aucun état requis, `ensurePNR` auto-crée le PNR comme NM) | ✅ (CHECK FORMAT) | ⬜ | ✅ compatible XE (statut `HX`) et DL (suppression réelle) comme un vrai segment, sans toucher à l'inventaire (ni vol ni classe) |
| XE / XE1 / XE1-2 / XEALL | ✅ | ✅ (déjà annulé → erreur dédiée) | ✅ (NO ACTIVE PNR) | ✅ (index hors bornes) | ✅ | ✅ (bloqué si TST/dernier segment/dernier ADT/INF associé) |
| NM | ✅ | ✅ (multi-pax autorisé, cohérent) | ⬜ (auto-crée le PNR) | ✅ **NM-1 corrigé** (confirmé par Massy) : apostrophe/tiret acceptés (`O'BRIEN`, `JEAN-PIERRE`) | ⬜ | ⬜ |
| AP | ✅ | ✅ (additif, normal) | ⬜ | ❌2 **corrigé** : payload vide rejeté (CHECK FORMAT), aligné sur RM/OP/etc. | ⬜ | ⬜ |
| APE | ✅ | ✅ | ⬜ | ✅ (regex email) | ⬜ | ⬜ |
| SSR | ✅ | ✅ | ⬜ | ✅ (format) | ⬜ | ⬜ |
| OSI | ✅ | ✅ | ⬜ | ✅ (format) | ⬜ | ⬜ |
| RM | ✅ | ✅ | ⬜ | ✅ (vide rejeté) | ⬜ | ⬜ |
| OP | ✅ | ✅ | ⬜ | ✅ (date/format) | ⬜ | ⬜ |
| RF | ✅ | ✅ (écrase, correct) | ⬜ | ✅ (vide, `RF+` rejeté) | ⬜ | ✅ (exigé par ER) |
| TKTL / TKOK / TKXL (famille TK complétée Mission 15) | ✅ (3 formes) | ✅ (écrase — un seul élément TK par PNR, `TKOK` après `TKTL` remplace, n'additionne pas) | ⬜ | ✅ (date pour TL/XL, pas de date pour OK) | ⬜ | ✅ compatible XE/DL (`cancellableKinds`) et modification par n° (`NOT ALLOWED` sur la date d'un TKOK, qui n'en a pas) |
| FP | ✅ | ✅ (écrase) | ⬜ | ✅ (CASH/CC regex) | ⬜ | ✅ (exigé par ET/TTP) |
| ER | ✅ | ✅ (locator stable) | ✅ (NO ACTIVE PNR, END PNR FIRST si NM/AP/RF manquant) | ⬜ | ✅ | ✅ (valide les TST CREATED→VALIDATED ; logique d'enregistrement partagée avec ET via `recordPnr`, Mission 16 Étape 0) |
| RT | ✅ | ✅ (pur) | ✅ (NO ACTIVE PNR) | ⬜ | ✅ | ⬜ |
| IG | ✅ | ✅ | ✅ (NO RECORDED PNR si rien à annuler) | ⬜ | ❌5 **corrigé** (Mission 15 Étape 0, 06/07/2026) : résurrectait un PNR non lié via un pointeur global périmé ; sièges vendus non restitués | ⬜ |
| IR | ✅ | ✅ | ✅ (PNR NOT FOUND / NO RECORDED PNR distincts) | ✅ (locator format) | ❌5 **corrigé** (même famille qu'IG, voir note 5) | ⬜ |
| XI | ✅ | ✅ (RT vide si déjà rien) | ⬜ | ✅ (variantes XIn rejetées) | ✅ (garde le recorded en store) — ❌5 **corrigé** : restitue désormais les sièges non enregistrés | ⬜ |
| QP/QD/QE/QN/QR/QS | ✅ | ✅ (idempotent QS, QE) | ✅ (NO RECORDED PNR, NO ACTIVE QUEUE, QUEUE NOT FOUND) | ✅ (format id) | ⬜ | ⬜ |
| FXP | ✅ | ✅ (update en place, pas de doublon TST) | ✅ (NO ITINERARY) | ⬜ | ✅ | ❌3 **corrigé** : exige ≥1 NM (`NO NAME` sinon) — confirmé par Massy 05/07 |
| FXR | ✅ | ✅ | ✅ (NO ITINERARY) | ⬜ | ✅ | ✅ n'exige PAS de NM (confirmé par Massy 05/07, distinct de FXP/FXB — contrôle retiré) |
| FXB | ✅ | ✅ | ✅ (NO ITINERARY) | ⬜ | ✅ | ❌3 **corrigé** : exige ≥1 NM (`NO NAME` sinon) — confirmé par Massy 05/07 |
| FXX | ✅ | ✅ (STORED stable) | ✅ (NO ITINERARY/NO TST) | ⬜ | ✅ | ⬜ (FXX ne crée pas de TST, ne tarife pas sans TST existant) |
| FXL | ✅ | ✅ (pur affichage) | ✅ (NO TST) | ✅ (`/` → FUNCTION NOT APPLICABLE) | ⬜ | ⬜ |
| TQT | ✅ | ✅ (pur) | ✅ (NO TST) | ✅ (id inconnu → NO TST) | ⬜ | ⬜ |
| FQN | ✅ | ✅ (pur) | ✅ (NO TST) | ✅ (index hors bornes → fallback 1er) | ⬜ | ⬜ |
| ET (**corrigé Mission 16 Étape 0**) | ✅ (jumeau de ER, ne réaffiche pas) | ✅ (idempotent, même locator) | ✅ (NO ACTIVE PNR, END PNR FIRST) | ⬜ | ✅ | ✅ N'émet plus de billet (seul TTP le fait) — ancien comportement partagé `ET`/`TTP` séparé |
| TTP | ✅ | ✅ (TICKET ALREADY ISSUED) | ✅ (NO ITINERARY/NO TST/NO FORM OF PAYMENT) | ⬜ | ⬜ | ✅ (dépend TST+FP) — seule commande émettant un billet depuis Mission 16 Étape 0 |
| TWD (ex-VOID, affichage) | ✅ | ✅ (pur affichage) | ✅ (NO TICKET) | ✅ (format numéro billet) | ⬜ | ⬜ — **Mission 15** : VOID renommé TWD (affichage) / TWX (annulation) pour coller au vrai flux Amadeus |
| TWX (ex-VOID, annulation) | ✅ | ❌4 **corrigé** : re-void d'un billet déjà void par numéro exact → `NOTHING TO CANCEL` | ✅ (NO TICKET) | ✅ (format numéro billet) | ⬜ | ✅ (dévalide le TST lié si plus aucun billet actif dessus) |
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

### ❌5 — IG/IR/XI : pointeur global périmé résurrecte un PNR non lié + sièges jamais restitués
Signalé par Massy (06/07/2026) : « IG ne sort pas complètement du PNR et ne l'ignore pas. »
`resolveRecordedLocator` avait un 3e niveau de repli sur `state.lastRecordedLocator`, un pointeur
GLOBAL "dernier PNR jamais enregistré dans toute la session" — sans rapport avec le PNR actif
courant. Scénario de reproduction : `ER` (PNR A) → `XI` → nouveau PNR B jamais enregistré → `IG`
résurrectait A au lieu de simplement jeter B. En même temps, aucune des trois commandes ne
restituait les sièges vendus via `SS` pour la part non enregistrée d'un PNR discarded/reverted
(état fantôme dans `state.lastAN`). **Corrigé** : suppression du pointeur global (le seul repère
valide est désormais le PNR actif courant, via son propre `recordLocator`) ; restitution des
sièges scoping strictement à la « queue non enregistrée depuis le dernier ER » du PNR concerné
(jamais celle d'un autre PNR, y compris lors d'un `IR <AUTRE-LOCATOR>`). Matrice complète et
détail des tests dans `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` §2.2.

### ✅ NM-1 — Noms avec apostrophe/tiret rejetés (corrigé, confirmé par Massy)
`parseNmAdultEntries` utilisait `^([A-Z]+)\/([A-Z]+)$` pour nom/prénom : n'acceptait ni apostrophe
ni tiret. Exemples qui échouaient avec `CHECK FORMAT` alors que ce sont des cas valides en usage
réel : `NM1O'BRIEN/JOHN MR`, `NM1JEAN-PIERRE/MARTIN MR`, `NM1SAINT-JEAN/MARIE-CLAIRE MRS`.

Repris de la session précédente (Bug 4, jamais tranché). Confirmé par Massy dans cette mission —
classe de caractères étendue à `[A-Z'-]+` dans `parseNmAdultEntries`, `chdMatch` et `infMatch`.

### ✅ DATA-1 — AN/TN/SN acceptent n'importe quel code ville à 3 lettres (corrigé en Mission 03)
Aucune commande de disponibilité ne consultait `deps.locations` (la vraie table de lieux) : un
code syntaxiquement valide mais inexistant (ex. `ANDECZZZXXX`) générait quand même de faux vols
déterministes via `buildOfflineAvailability`. **Corrigé** : `validateCityCodes()` consulte
`deps.locations.findByIata()` (exposé par `packages/data`) et renvoie `NOT IN TABLE` pour un code
inconnu, quand un provider est configuré (toujours le cas dans `apps/web`). Voir
`docs/ERREURS-AMADEUS.md` pour le détail du câblage et des tests.

## Hors périmètre (non couvert par ce dispatcher)
`RH` (historique PNR) n'existe pas dans le simulateur — déjà noté hors scope niveau 1-2 dans
`FIDELITE_AMADEUS_COMPARAISON.md`.

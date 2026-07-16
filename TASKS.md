# TASKS — Simulateur Amadeus GDS

> Tracker vivant exigé par `CLAUDE.md` §Méthode de travail (mis à jour à chaque session/mission).
> Classification des observations selon `CONSTITUTION.md` §5 : bug critique / incohérence
> fonctionnelle / amélioration recommandée / idée d'évolution.

## En cours

**Mission 07 reportée** (décision Massy 07/07/2026, à relancer quand il le décidera) — Partie A
reste close (voir historique ci-dessous). **Mission 08 Étape 1 close** (moteur d'exercices,
Phase 6) : nouveau package `packages/exercises` (format JSON + `evaluate()`), aucune UI —
c'est l'Étape 2. Tout poussé sur `main`, suites vertes (268 core, 9 data, 14 exercises, 30 web,
12 e2e, lint et typecheck propres).

**Reprise exacte** : ouvrir `missions/MISSION-08.md`, démarrer l'**Étape 2** (exercices 1-4 +
UI minimale du mode exercice + e2e — un exercice réussi, un échoué). Le format JSON et le moteur
`evaluate()` sont déjà spécifiés et testés (`packages/exercises`) ; l'Étape 2 écrit le CONTENU
réel des 4 premiers exercices (FR+EN) dans `packages/exercises/content/` et branche l'UI dessus
(entrée « Mode exercices » depuis l'accueil, panneau consigne, boutons Vérifier/Indice/
Abandonner). Protocole habituel : suite + typecheck + lint après chaque ajout, rituel complet
(6 suites incluant `test:exercises` + e2e) à la fin de l'étape/mission.

**Reprise exacte** : Partie A de Mission 07 est terminée côté code. La suite (Partie B) est une
checklist **opérationnelle pour Massy** (générer les clés, les configurer sur Cloudflare,
recruter 5-15 pilotes, consigner les retours dans `docs/PILOTE.md`) — pas une tâche Claude Code.
Prochaine session Claude Code : soit une correction de bug remontée par un pilote (boucle
corrective décrite dans `MISSION-07.md`, traiter immédiatement, protocole habituel), soit la
prochaine mission une fois le pilote conclu.

## Fait (par session, datée)

### 16/07/2026 — Mission 08 Étape 1 (moteur d'exercices guidés — format + evaluate(), Phase 6)
- Nouveau package `packages/exercises` (même architecture que `packages/core` : pur, zéro UI,
  `// @ts-check` + JSDoc, `node --test`), dépendance vers `@simulateur/core` (réutilise
  `createInitialState`/`processCommand` — un exercice se joue dans le VRAI moteur, aucune
  simplification).
- **Format JSON d'un exercice** documenté en JSDoc (`Exercise`/`Objectif`/`JalonTrace`/`Aide`
  typedefs dans `src/index.js`) : `id`, `niveau`, `titre`/`consigne` bilingues, `seedState`
  (état initial, fusionné sur `createInitialState()`), `objectifs[]` (critères sur l'état
  final), `jalonsTrace[]` (commandes-clés optionnelles, jamais bloquantes), `aides[]` (indices
  à pénalité), `bareme` implicite (points par objectif).
- **`evaluate(exercise, finalState, commandTrace, options)`** : évalue chaque `objectif`
  indépendamment (7 types couverts : `pnr-recorded`, `segment-count`, `route`, `passenger-name`,
  `tst-present`, `ticket-issued`, `element-status`), `passed` = tous les objectifs `required`
  passent (défaut : tous), `score`/`maxScore` en points, pénalité de `hintsUsed` appliquée aux
  `aides[]` révélées dans l'ordre, plancher à 0. Type d'objectif inconnu → échec propre (pas de
  crash, pas de faux positif silencieux). `jalonsTrace` évalué séparément (`jalonsFeedback`),
  jamais pris en compte dans `passed` — conforme au principe du mission : évaluation par l'état
  final, pas par la séquence exacte.
- Tests golden (`evaluate.test.js`, 14 tests) sur un exercice fixture représentatif (réservation
  ALG→PAR pour M. Dupont, mission 08 §Vision) : **deux chemins valides différents réussissent**
  tous les deux (vente numérique après AN, vs long sell sans AN — la même fin d'état, deux
  parcours) ; **un échec typique** (vol vendu mais dossier jamais nommé/enregistré) donne un
  feedback précis objectif par objectif, pas un échec sec ; couverture unitaire des 7 types
  d'objectif (dont statuts annulés ignorés par `segment-count`, liste d'attente `HL` via
  `element-status`) + pénalités d'indices + type inconnu.
- Chaîne d'outillage étendue au nouveau package (README/CLAUDE.md §Outillage déjà à jour dans
  leur principe, appliqué ici) : `npm run test:exercises` (racine), husky pre-commit
  (`.husky/pre-commit`), `lint-staged.config.mjs` (typecheck sur `packages/exercises/src/**/*.js`,
  même pattern que `packages/core`). `npm install` exécuté pour enregistrer le nouveau workspace.
- **Mission 08 Étape 1 close** : suites vertes (268 core, 9 data, **14 exercises**, 30 web,
  12 e2e — web/e2e inchangés, cette étape ne touche aucune UI), lint et typecheck (core +
  exercises) propres. Aucun contenu réel d'exercice encore écrit (les 10 exercices canoniques
  sont l'Étape 2/3, pas celle-ci) — le fixture de test n'est qu'une démonstration du moteur.
  Enchaînement sur l'Étape 2 selon la décision de Massy pour la suite de session.

### 07/07/2026 — Mission 07 Partie A (préparation technique du pilote)
- **Analytics Cloudflare sans cookies** : nouveau module `apps/web/src/analytics.js`
  (`initAnalytics()`, appelé une fois dans `main.jsx`) qui injecte le beacon Cloudflare
  UNIQUEMENT si `VITE_CF_BEACON_TOKEN` est configuré (variable Cloudflare Pages) — même
  convention que `VITE_FALLBACK_KEY_HASHES` : vide par défaut, donc inactif (aucun script
  externe chargé, aucun appel réseau) tant que Massy ne configure pas la variable lui-même.
  Documenté dans `README.md` §Mesure d'audience.
- **Bouton Feedback** (`FeedbackButton.jsx`) : discret, coin bas-droit, présent sur l'accueil et
  le terminal (les deux emplacements demandés par la mission). Mailto pré-rempli avec version
  (`1.0.0-pilot`) et écran d'origine dans l'objet, vers l'adresse de contact déjà utilisée pour
  « Demander un accès ». FR/EN via le dictionnaire i18n existant.
- **Guide de démarrage rapide** (`QuickStartGuide.jsx`) : bouton « ? » discret, coin bas-gauche,
  même deux emplacements. Overlay listant les commandes de base (AN/SS/NM/AP/RF/ER/RT/HELP) et
  la séquence complète de réservation, FR/EN, imprimable (bouton dédié + règles `@media print`
  qui masquent tout le reste de l'interface). `Terminal.jsx` lit la langue déjà choisie via
  `useLang()` (persistée en localStorage depuis l'accueil) sans dupliquer d'état — le terminal
  lui-même reste en anglais Amadeus-authentique, seule cette enveloppe est traduite (décision
  confirmée le 05/07/2026, non remise en cause).
- Tests : 8 nouveaux tests Vitest (`analytics.test.js`, `FeedbackButton.test.jsx`,
  `QuickStartGuide.test.jsx`) + 1 nouveau scénario Playwright (`e2e/pilot.spec.js`, guide +
  feedback accessibles depuis l'accueil ET le terminal). 22→30 tests web, 10→12 tests e2e.
  **Mission 07 Partie A close** : 6 suites vertes (268 core, 9 data, 30 web, 12 e2e, lint et
  typecheck propres), build vérifié.
- **Partie B (checklist opérationnelle Massy)** : génération des clés, configuration
  `ACCESS_KEY_HASHES`/`VITE_CF_BEACON_TOKEN` sur Cloudflare, recrutement des pilotes, tenue de
  `docs/PILOTE.md` — hors périmètre Claude Code, pas d'action prise ici.

### 07/07/2026 — Mission 19 réduite (magasin de PNR + RT locator/nom, clôture de la chaîne)
- **Question de persistance posée en début de session** (comme demandé explicitement par la
  bannière PÉRIMÈTRE RÉDUIT de `MISSION-19.md`) : Massy a confirmé **en mémoire pour la session
  de travail uniquement**, pas de localStorage — cohérent avec l'architecture actuelle
  (`state.pnrStore`, déjà alimenté par `ER`/`ET`/`ERK`/`ETK` depuis Mission 15/13).
- **Choix d'architecture assumé** : le magasin de PNR existait déjà côté `packages/core`
  (`state.pnrStore`, clé = record locator, alimenté par `recordPnr`) et fonctionne, testé
  extensivement (IG/IR/XI). Plutôt que de le migrer vers `packages/data` (refactor risqué sans
  bénéfice fonctionnel pour ce périmètre réduit, contraire à CONSTITUTION §8 "minimiser le
  risque de régression"), cette mission l'expose simplement via de nouvelles commandes `RT`.
- `RT<LOCATOR>` (6 lettres) : récupère un PNR enregistré par son record locator, même sémantique
  transactionnelle que `IR<LOCATOR>` (discard des segments non enregistrés de la session
  courante, restitution d'inventaire) — testé explicitement.
- `RT/<NOM>` : recherche par nom de famille (sous-chaîne, insensible à la casse) dans tous les
  PNR enregistrés. Une seule correspondance → récupération directe. Plusieurs → liste de
  similitude numérotée (`RT<n>` sélectionne, `RT0` réaffiche la liste). Aucune → `PNR NOT FOUND`.
- `RT<AA><vol>/<ddMMM>-<NOM>` : même recherche par nom, filtrée en plus par vol+date exacts
  (utile pour désambiguïser deux passagers du même nom sur des PNR différents).
- Non-collision vérifiée avec les `RT` partiels reportés en v2 (`RTN`/`RT ABC123`/`RTZZ` restent
  `CHECK FORMAT`, aucune régression sur les tests Mission 16).
- `RH`, `SP`/`EF`/`RTAXR`, `RRN`/`RRI`/`RRP` **reportés en v2** (décision Massy 07/07/2026, hors
  périmètre réduit de cette mission).
- 259→268 tests core (9 nouveaux : retrieve par locator, par nom simple/multiple, liste
  `RT<n>`/`RT0`, filtre vol+date, cas d'erreur, discard transactionnel). **Mission 19 réduite
  CLOSE** : 6 suites vertes (268 core, 9 data, 22 web, 10 e2e, lint et typecheck propres).
  **Chaîne d'implémentation v1.x terminée** (missions/README.md §ALLÈGEMENT) — prochaine étape :
  Mission 07 (pilote).

### 07/07/2026 — Mission 13 (statuts de segment & liste d'attente HL/UC/KK/KL + ETK/ERK)
- **Spec validée par Massy en début de session** (question posée par l'assistant avant de coder,
  comme demandé par la mission) : modèle de statuts HK/HL/KK/KL/UC/UN/NO validé tel quel ;
  règle de promotion FIFO validée — quand une place se libère sur un vol (`XE`/`DL`), le premier
  `HL` de CE VOL (pas seulement de la même classe) passe `KL`.
- `SS`/SS long sell : classe pleine → segment `HL` (waitlist) au lieu du refus `NO SEATS` ; le
  vrai refus (`NOT ENOUGH SEATS`) reste pour une demande partiellement insatisfaite. `...PE`
  force un waitlist explicite même si des sièges restent (ex. `SS1Y1PE`). Un `HL` ne décrémente
  jamais l'inventaire (`segmentHoldsInventory`, nouvelle fonction partagée : seuls HK/KK/KL
  tiennent un vrai siège).
- **Bug critique corrigé au passage** (CONSTITUTION §3, famille de bugs) : `XE` ne libérait
  JAMAIS l'inventaire d'un segment annulé (contrairement à IG/DL/SB/XI) — une classe pleine le
  restait pour toujours après une annulation. Corrigé dans `markSegmentElementsCancelled`
  (point de passage commun XE/XEALL/XE-range). Détecté en creusant l'inventaire pour la
  promotion de liste d'attente : sans ce correctif, la promotion n'aurait jamais eu l'occasion
  de se déclencher.
- **2e correctif du même type** : `handleSSLongSell` reconstruisait une disponibilité complète
  à CHAQUE appel (jamais de cache), donc un 2e long sell sur le même vol écrasait silencieusement
  l'inventaire déjà entamé par le 1er — même famille de bug que ci-dessus, cassait directement
  le test du waitlist en long sell. Corrigé en réutilisant `state.lastAN` quand le contexte
  correspond déjà (même pattern que `SB`).
- Promotion `HL→KL` (`promoteWaitlistOnRelease`) : FIFO par ordre de création (ordre du tableau
  `itinerary`, jamais réordonné), recherche sur tout le vol (choix Massy) mais la promotion
  elle-même reste gatée par `findAvailabilityClass` sur la propre classe du `HL` — un siège
  libéré dans une AUTRE classe ne promeut jamais un `HL` d'une classe différente (testé
  explicitement), pas de fausse confirmation inventée.
- `ETK`/`ERK` : jumeaux de `ET`/`ER` (mêmes égalités strictes, non-collision testée) qui
  résolvent d'abord les codes-conseil (`applyWaitlistAdviceCodes`) : KK/KL→HK, UC/UN/NO
  supprimés de l'itinéraire (pas d'historique RH — mission 19 future).
  `ETK` n'affiche pas et n'émet pas de billet (comme `ET`) ; `ERK` réaffiche (comme `ER`).
- `n/HK`\|`HL`\|`KK`\|`KL`\|`UC`\|`UN`\|`NO` (item 5) : override manuel du statut d'un segment
  par n° d'élément RT, ajouté à `handleElementModify` (seule exception SEG de ce handler,
  documentée). Cohérence d'inventaire maintenue par `applySegmentStatusOverride` : libère en
  sortant d'un statut tenu, consomme (ou `NO SEATS`) en y entrant. Bloqué `NOT ALLOWED - TST
  SEGMENT` si verrouillé par un TST (même garde que SB), `ELEMENT NOT FOUND` sur un segment déjà
  annulé.
- IG/IR/XI bénéficient automatiquement du même modèle (item 6) via `segmentHoldsInventory`
  partagé dans `releaseInventoryForSegments` — testé explicitement (KK libéré correctement).
- **Hors périmètre, noté en Backlog** : interaction FXP/TTP avec un segment `HL`/`UC` non
  confirmé (peut-on tarifer/émettre un billet dessus ?) — non demandé par la mission, non
  deviné, à trancher dans une session future si besoin.
- 12 nouveaux tests dédiés (waitlist SS/PE, XE/DL + promotion FIFO, non-promotion inter-classes,
  override manuel, ETK/ERK, IG restitution, non-collision ETK/ERK vs ET/ER) + 1 test existant
  mis à jour pour refléter le nouveau comportement (`SS` sur classe pleine ne refuse plus).
  247→259 tests core. **Mission 13 close** : rituel complet exécuté (6 suites vertes : 259 core,
  9 data, 22 web, 10 e2e, lint et typecheck propres).

### 07/07/2026 — Mission 17 réduite (DD, DC, DNA — utilitaires agent, clôture de la mission)
- **DD** (calculateur de dates, pur calcul) : `DDddMMM` (date + jour de semaine),
  `DDddMMM/±n` (décalage signé depuis une date donnée), `DD±n` (décalage signé depuis
  aujourd'hui). Réutilise les helpers de date déjà présents (`ddmmmToDate`, `formatDDMMM`,
  `dayOfWeek2`), même convention année courante sans rollover que le reste du moteur.
  `CHECK DATE` sur date invalide (`DD31FEB`). Un code ville seul (`DDPAR`, un des exemples
  donnés par la mission elle-même) ne correspond à aucune des formes implémentées → `CHECK
  FORMAT` : décision documentée plutôt que devinée (une variante "heure locale par ville"
  aurait demandé une donnée de fuseau horaire absente du projet, ce qui aurait contredit la
  note "pur calcul, aucune donnée externe" de la doc). Sortie exacte (libellés `FROM`/`TO`)
  marquée à vérifier terrain avec Massy — logique de calcul fiable et testée.
- **DC** (pays/nationalité) et **DNA** (compagnies) : nouvelles tables dans `packages/data`
  (`InMemoryStore.loadCountriesFromArray`/`loadAirlinesFromArray` + `cmdDC`/`cmdDNA`,
  `createCountryProvider`/`createAirlineProvider`), chargées à la demande côté `Terminal.jsx`
  comme `locations` pour DAC/DAN. `DC` reprend la dualité decode-par-code/encode-par-texte de
  DAC/DAN en une seule commande ; `DNA` ajoute une 3e forme (code numérique de billetterie),
  conforme aux exemples de la mission (`DNA DELTA`/`DNA AF`/`DNA 057`). Nouvelles données
  publiques (codes IATA pays/compagnies, pas une règle métier Amadeus) : `countries.json` (20
  pays, dont DZ/FR/MA/TN cohérents avec le focus Algérie du projet) et `airlines.json` (13
  compagnies, dont les 6 déjà utilisées par le provider de disponibilité AH/AF/TK/PC/SV/AT) —
  à compléter si besoin, non exhaustif par choix (CONSTITUTION §7).
- `resolveDeps` étendu pour accepter `deps.countries`/`deps.airlines` (même contrat que
  `deps.locations` : objet avec une méthode `lookup`), sinon `COUNTRY/AIRLINE PROVIDER NOT
  CONFIGURED`. `HELP`/`HE DD`/`HE DC`/`HE DNA` documentés.
- 237→247 tests core (dont DD/DC/DNA + non-collision), 3→9 tests `packages/data`. Build web
  vérifié (`countries.json`/`airlines.json` bien copiés dans `dist/data/`), vérification
  manuelle bout-en-bout des 3 commandes avec les vraies données. **Mission 17 réduite close** :
  rituel complet exécuté (6 suites vertes : 247 core, 9 data, 22 web, 10 e2e, lint et typecheck
  propres).
- **Hors périmètre de cette mission (reporté en v2, décision Massy 07/07/2026)** : `DO`, `DF`,
  `DNE`, `DB`, `DM`, `JI`/`JO` — voir `docs/COMMANDES-MANQUANTES.md` §Priorité 2.

### 07/07/2026 — Mission 16, commande 6/6 (RE/RE2 — clôture de la mission)
- Nouvel état CORE `state.commandHistory: string[]` (comme `state.lastDisplay`) : historique des
  entrées uppercasées, alimenté à chaque `processCommand` juste avant le dispatch. `RE` lui-même
  n'est jamais enregistré (sinon un second `RE` rappellerait son propre rappel, comportement
  confus) — toute autre commande l'est.
- `RE` = rappelle et ré-exécute la dernière entrée ; `RE(\d{1,2})?` généralisé (`RE2`, `RE3`…, n
  par défaut 1) plutôt que de coder seulement les deux exemples nommés — généralisation naturelle
  à faible risque, pas une règle métier inventée. `NO PREVIOUS ENTRY` si l'historique est trop
  court ou vide (nouveau texte ajouté à `ERROR_EVENT_TEXTS` pour classification `error`).
- `RT` partiels (item 5/6) confirmés **reportés en v2** par décision de Massy (06/07/2026, déjà
  actée dans `MISSION-16.md`) : aucun code ajouté, seulement des tests de non-collision prouvant
  que le dispatcher actuel (`if (c === "RT")` en égalité stricte, fallback générique `CHECK
  FORMAT`) laisse déjà passer `RTN`/`RT ABC123`/`RTZZ` sans collision ni crash.
- 7 nouveaux tests (recall nominal, RE2, historique vide, historique trop court, non-ré-
  enregistrement de RE, non-collision RE/RF, non-collision RT partiels). 230→237 tests core, tout
  vert. `HELP`/`HE RE` documentés. `docs/COMMANDES-MANQUANTES.md` et `AUDIT-COMMANDES.md` mis à
  jour (RE fait, RT partiels reportés).
- **Mission 16 close** : rituel complet exécuté (6 suites vertes : 237 core, 3 data, 22 web, 10
  e2e — la 1ère tentative web/e2e a rencontré des flakes d'environnement sans rapport avec le
  changement, résolus par ré-exécution ; l'e2e local nécessite `VITE_FALLBACK_KEY_HASHES` en
  variable d'environnement comme en CI, sinon un seul test d'accès par clé échoue pour une raison
  d'environnement, pas de régression).

### 06/07/2026 — Mission 16, commande 3/6 (AC/SC/ACR — spec architecte, 8 règles déterministes)
- L'architecte a ajouté une spec complète et non ambiguë dans `MISSION-16.md` (§Spec AC/SC/ACR),
  levant l'ambiguïté relevée à la clôture précédente (ordre de désambiguïsation du parsing en
  8 règles strictes, testées dans cet ordre exact).
- Refactor `state.lastDisplay` : `itemLines: string[]` → `items: string[][]` (chaque item = 1 à
  3 lignes) pour supporter les entrées `AN` qui peuvent wrapper sur plusieurs lignes — nécessaire
  car `AC` doit réafficher en style `AN` paginé, ce que le modèle de la commande 1/6 (pensé pour
  `TN`/`SN`, 1 ligne = 1 item) ne permettait pas. `formatAvailabilityItem` extrait de `handleAN`
  pour réutilisation sans dupliquer le rendu multi-lignes.
- `AC`/`SC` : rejouent `state.lastAN.query` en changeant SEULEMENT le delta indiqué (date, delta
  jours signé, paire de villes, origine seule, destination seule via `//`, filtre compagnie
  `/AXX[,YY,ZZ]` max 3, filtre classe `/Cx[y,z]` max 3 (`/C` seul annule), sièges min `/Bn`,
  heure de départ mini 4 chiffres) — tous les autres critères conservés et chaînables (`AC/CF`
  puis `AC3` puis `MD` fonctionne). `AC` réaffiche toujours en style AN, `SC` toujours en style
  SN, quel que soit le type du dernier affichage réel (ex: `AC` juste après un `SN`). `MN`/`MY`
  (commande 2/6) mis à jour pour préserver les mêmes filtres (cohérence de toute la famille).
- `ACR` : inverse les villes, défaut départs ≥18h00 même jour ; `ACRhhmm` (heure) ;
  `ACRddMMMhhmm` (date + heure). Toujours en style AN.
- Erreurs réutilisées : `NOT IN TABLE`, `CHECK DATE`, `CHECK CLASS OF SERVICE` (lettre de classe
  invalide) ; filtre compagnie/sièges/heure sans correspondance → liste vide affichée, pas
  d'erreur inventée (non spécifié par l'architecte). 209→230 tests, tout vert (typecheck/lint/
  web aussi).

### 06/07/2026 — Mission 16, commandes 1-2/6 (MD/MU/MT/MB, MN/MY)
- **1/6 — MD/MU/MT/MB** : nouvel état CORE `state.lastDisplay` ({type, header, itemLines,
  pageSize, page}), demandé explicitement par la mission ("principe d'architecture" avant les
  commandes). `TN`/`SN` n'affichent plus que la page courante (avant : toutes les pages d'un
  coup, comportement historique changé) ; `MD`/`MU`/`MT`/`MB` font défiler, bornes cadenassées en
  silence (pas d'erreur inventée pour "après la dernière page"). `AN`/`RT` pas branchés (jamais
  assez de résultats pour paginer dans ce simulateur aujourd'hui, pas une régression). Dispatch
  par égalité stricte (`c === "MD"`, pas `startsWith`) — testé explicitement pour ne jamais
  intercepter un futur préfixe plus long (leçon Mission 04). 197→204 tests.
- **2/6 — MN/MY** : relance `state.lastAN.query` (from/to/date) décalé de ±1 jour comme un vrai
  `AN`, même si le dernier affichage était un `TN`/`SN` (état partagé). Chaînable, résultat
  addressable par SS ensuite. `NO ACTIVE DISPLAY` sans recherche préalable. 204→209 tests.
- Suites vertes après chaque commande (core/typecheck/lint, + web à la fin de ce lot).

### 06/07/2026 — Mission 16, Étape 0 (correction fidélité ET — reliquat arbitré de M15)
- L'architecte a mis à jour `missions/MISSION-16.md` pour trancher explicitement le point laissé
  en Backlog à la clôture de Mission 15 (correction `ET` mentionnée dans la doc mais absente de
  la liste numérotée de M15 — périmètre non élargi de ma propre initiative à l'époque).
- `ET` partage désormais la logique d'enregistrement de `ER` (helper commun `recordPnr` extrait
  du handler `ER`) : valide NM/AP/RF, génère/réutilise le record locator, promeut les TST
  CREATED→VALIDATED, enregistre le snapshot — **mais n'affiche que la confirmation** (`PNR
  RECORDED` + `RECORD LOCATOR X`), sans réafficher le PNR (contrairement à `ER`). `ET` n'émet
  plus de billet : seul `TTP` le fait désormais (`if (c === "TTP")`, retiré de l'ancien
  `if (c === "ET" || c === "TTP")` partagé).
- Tests : ~16 tests existants qui utilisaient `ET` comme raccourci « émettre un billet »
  (TWX/TWD/NU/ITR-EML/RT/XE, dans `processCommand.test.js` et `e2e.golden.test.js`) basculés sur
  `TTP` — c'est la commande qui émet réellement, pas un simple renommage cosmétique. 5 nouveaux
  tests dédiés au vrai comportement `ET` (enregistre sans réafficher, n'émet pas de billet,
  exige NM/AP/RF comme ER, idempotent). `HELP`/`HE ET`/`HE TTP` mis à jour pour refléter la
  distinction. Suite core 192 → 197 tests, tout vert (typecheck/lint aussi).
- `docs/COMMANDES-MANQUANTES.md` (tableau des 2 écarts) et le Backlog `TASKS.md` mis à jour :
  l'écart `ET` est maintenant marqué corrigé, à égalité avec `VOID`→`TWD`/`TWX` (Mission 15).

### 06/07/2026 — Mission 15 (servicing du PNR actif — chaîne d'implémentation)
- **Étape 0 (bug critique signalé par Massy, traité en premier)** : « IG ne sort pas complètement
  du PNR et ne l'ignore pas. » Cause racine : `resolveRecordedLocator` avait un repli sur
  `state.lastRecordedLocator`, un pointeur GLOBAL déconnecté du PNR actif courant — après
  ER (PNR A) → XI → nouveau PNR B jamais enregistré → IG résurrectait A au lieu de jeter B. Pointeur
  supprimé ; résolution scopée strictement au PNR actif. Même famille : IG/IR/XI ne restituaient
  jamais les sièges vendus via SS lors d'un discard/rollback — corrigé (restitution scoping à la
  part non enregistrée depuis le dernier ER, jamais celle d'un autre PNR). Matrice d'état complète
  documentée dans `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` §2.2. 137→141 tests.
- **1/8 — VOID→TWD/TWX** : `VOID` retiré du dispatcher, remplacé par `TWD` (affichage, format
  minimal — richesse réelle de l'écran non modélisée, marqué « à vérifier ») et `TWX` (annulation,
  logique VOID conservée). 141→143 tests.
- **2/8 — SS long sell** : `SS<compagnie><vol><classe><date><villes><pax>` vend directement sans
  AN préalable ; alimente `state.lastAN` comme un AN implicite (sièges partagés avec un SS
  numérique ultérieur, restitution IG/IR/XI déjà couverte). 143→151 tests.
- **3/8 — SB rebooking** : classe (`SBY6`), date (`SB12APR7`), vol (`SBBA194*3`) — référence le
  segment par son numéro d'élément RT (même convention que XE). **Syntaxe non confirmée par
  expérience terrain**, déduite des 3 exemples de `docs/COMMANDES-MANQUANTES.md` — marqué
  « à vérifier ». Ancien segment `HX`, nouveau `HK`, inventaire libéré/re-décrémenté sans écraser
  d'autres sièges déjà vendus sur le même contexte. Bloqué par `NOT ALLOWED - TST SEGMENT` (même
  règle que XE). 151→158 tests.
- **4/8 — Modification par n°** (`n/valeur`) : périmètre réduit aux éléments texte/date libres
  (RM/OSI/SSR/OP/TKTL) — `4/2` (sièges) et `2/HK` (statut segment) volontairement pas faits
  (redondants avec SB, voir `docs/COMMANDES-MANQUANTES.md`). `NOT ALLOWED` pour tout autre type
  d'élément. 158→170 tests.
- **5/8 — NU** correction de nom : position référencée deux fois (`NU1/1SMITH/JOHN MR`), doit
  correspondre sinon `CHECK FORMAT`. Bloqué après émission d'un billet (`NOT ALLOWED`). 170→175.
- **6/8 — DL** suppression de segment : en relisant `cancelElements` (logique XE), tous les autres
  types d'éléments sont déjà réellement supprimés par XE (pas juste historisés) — `DL` n'a donc de
  sens réel QUE pour les segments (`NOT ALLOWED` pour tout le reste, rediriger vers XE). Mêmes
  garde-fous que XE (`NOT ALLOWED - TST SEGMENT`, `NOT ALLOWED - LAST SEGMENT`), restitution
  d'inventaire. 175→182 tests.
- **7/8 — SI ARNK** : élément d'itinéraire neutre (aucune détection automatique de trou de
  continuité n'existait — rien à « supprimer » comme avertissement). Compatible XE/DL comme un
  vrai segment. 182→187 tests.
- **8/8 — TKOK/TKXL** : refactor de `pnr.tktl` (date simple) vers `pnr.tk = {kind, date}` — un
  seul élément TK par PNR (poser `TKOK` après `TKTL` remplace, n'additionne pas). 187→192 tests.
- **Écart de fidélité NON traité, à trancher** : `docs/COMMANDES-MANQUANTES.md` et le libellé de
  Mission 15 dans `missions/README.md` mentionnent aussi la correction de `ET` (traité aujourd'hui
  comme une émission de billet, alors qu'en vrai Amadeus `ET` = End Transaction, jumeau de `ER`,
  et seul `TTP` émet). **Mais la liste numérotée de `missions/MISSION-15.md` §Commandes à
  implémenter ne contient PAS ce point** (8 items listés, ET absent) — periomètre non élargi de ma
  propre initiative (CONSTITUTION §6). Signalé pour arbitrage : implique un changement de
  comportement significatif (ET n'émettrait plus de billet), qui casserait une bonne partie des
  tests de cette session utilisant `ET` comme raccourci pour « émettre un billet ». Proposé comme
  item dédié d'une mission future (voir Backlog ci-dessous).
- Suites : core 137→192 (+55), typecheck/lint verts après chaque commande, web (22) + e2e (10)
  verts en fin de mission, production vérifiée (`/api/verify-key` répond toujours correctement
  après déploiement — mission 100% `packages/core`, pas de changement web/functions).
- **Enchaînement immédiat sur MISSION-16** dans la même session (règle de la chaîne).

### 06/07/2026 — Mission 06 (accès par clé + habillage commercial v1)
- Décisions Massy en début de session : canal « demander un accès » = e-mail
  (massinissa.mehdani@gmail.com) ; wording de la proposition de valeur proposé par l'assistant.
- **Validation des clés côté serveur** : `functions/api/verify-key.js` (Cloudflare Pages
  Function), `POST {key} -> {valid}`. Clés jamais en clair : hachés SHA-256 dans la variable
  d'environnement Cloudflare `ACCESS_KEY_HASHES`. Anti-abus minimal (réponse identique clé
  absente/invalide/config vide, délai plancher 300ms, pas de listing).
- **Repli client documenté** (`VITE_FALLBACK_KEY_HASHES`, vide par défaut donc inactif en prod) :
  utilisé uniquement par les tests (clé `GDS-TEST-0001`, pas un vrai secret) — voir `CLAUDE.md`
  Phase 3 pour le détail du compromis accepté.
- **Écran d'accès** (`AccessGate.jsx`) : clé mémorisée en `localStorage`
  (`simulateur-amadeus:access-key-valid`), erreur sobre si invalide, terminal jamais monté sans
  clé validée (vérifié y compris en rechargeant/rappelant l'app directement).
- **Page d'accueil enrichie** (`Onboarding.jsx`) : proposition de valeur + public cible, aperçu
  du terminal réel-rendu (composant statique, pas une image), bouton « J'ai une clé d'accès »,
  bouton « Demander un accès » (mailto), disclaimer conservé.
- **FR/EN** : `apps/web/src/i18n/dictionary.js` (dictionnaire plat) + `useLang.js` (bascule
  mémorisée, FR par défaut). Le terminal reste en anglais Amadeus-authentique.
- **Outil de gestion des clés** : `scripts/generate-keys.mjs` — génère N clés `GDS-XXXX-XXXX`,
  écrit un CSV en clair dans `keys/` (gitignored) + affiche les hachés à coller dans Cloudflare.
  Usage documenté dans `README.md` §Gestion des clés (ajout/révocation sans toucher au code).
- Suite web passée à 22 tests Vitest (+11 : `keyHash.test.js`, `AccessGate.test.jsx`,
  `App.test.jsx` réécrit) ; Playwright étendu (10 scénarios au total, `onboarding.spec.js`
  réécrit pour couvrir accueil FR/EN + clé valide/invalide/persistance ; `terminal.spec.js` ajusté
  pour poser aussi le flag de clé validée). CI (`ci.yml`) injecte le haché de test pour l'étape
  e2e — aucun secret réel requis. Toutes les suites (core/data/web/e2e/lint/typecheck) vertes.

### 06/07/2026 — Mission 05 (déploiement public)
- Déployé sur Cloudflare Pages : **https://gds-amadeus-simulateur.pages.dev/**. Redéploiement
  automatique sur push `main` confirmé (plusieurs push, chacun a déclenché un build+deploy).
  Séquence complète AN→SS→NM→AP→RF→ER→RT vérifiée en production (Record Locator généré,
  onboarding + disclaimer visibles).
- **Bug 1 (déploiement échoue)** : premier essai créé un **Worker** (flux unifié Cloudflare
  "Workers & Pages") au lieu d'un projet Pages classique → `wrangler deploy` échouait
  ("application detection... run in the root of a workspace"), aucun `wrangler.jsonc` dans le
  repo pour lever l'ambiguïté du monorepo. Ajout de `wrangler.jsonc` (assets-only, pointe vers
  `apps/web/dist`) ; Massy a finalement recréé le projet en Pages classique, qui a fonctionné.
- **Bug 2 (titre "frontend" en prod)** : après déploiement réussi, la page affichait encore le
  titre par défaut de Vite au lieu du vrai titre/lang/description. Fausse piste explorée d'abord
  (cache de build Cloudflare, comportement `emptyOutDir` du bundler expérimental
  `rolldown-vite` — ni l'un ni l'autre n'était la cause, même si les deux correctifs ajoutés
  restent en place par hygiène, sans nuire). **Cause réelle** : `apps/web/index.html` (titre,
  `lang="fr"`, meta description) existait comme modification locale **jamais committée** depuis
  la session Phase 2 onboarding — chaque déploiement construisait donc le vrai template Vite
  resté en l'état dans git. Corrigé en committant le fichier.
- Jeton API Cloudflare (scope Pages, créé par Massy pour cette session) utilisé pour diagnostiquer
  et corriger via l'API (lecture des logs de build, désactivation temporaire du cache de build,
  déclenchement de déploiements de test) — révoqué par Massy après la mission.

### 05/07/2026 — Mission 04 (fidélité visuelle du terminal)
- `docs/FIDELITE-VISUELLE.md` créé : Massy a comparé le terminal au vrai Amadeus (expérience
  terrain) → **aucun écart visuel signalé**. Aucune modification cosmétique nécessaire.
- **Bug critique trouvé et corrigé pendant la vérification** (hors périmètre visuel, corrigé
  immédiatement — CONSTITUTION §5) : `splitANFilter()` (filtre compagnie `AN.../XX`) était
  appliqué à **toutes** les commandes dans `Terminal.jsx`, pas seulement AN. Toute commande
  contenant un `/` dont les 2 derniers caractères formaient un motif de 2 lettres se faisait
  tronquer avant d'atteindre le moteur. Cassait silencieusement `NM1<nom>/<prénom>` (signalé par
  Massy — "le nom est une variable", le bug ne dépendait d'aucun nom précis), `OP<date>/<texte>`,
  `TKTL/<date>`. Corrigé : le split ne s'applique que si la commande commence par `AN`.
- Un test Playwright existant ("full happy path") passait par accident depuis le début (il ne
  vérifiait que la ligne échouée affichée, jamais le contenu réel du PNR) — corrigé pour vérifier
  le Record Locator. Tests de non-régression ajoutés (Vitest + Playwright) pour NM/OP/TKTL avec
  un `/`.
- Suite web passée à 11 tests Vitest (+1), 8 Playwright inchangés, tout vert après le fix.

### 05/07/2026 — Mission 03 (messages d'erreur fidèles Amadeus)
- `docs/ERREURS-AMADEUS.md` créé : inventaire exhaustif des 30 messages d'erreur de
  `packages/core`. 4 déjà conformes (Phase 5 Étape 1), 3 confirmés/corrigés cette session
  (NO NAME, NOTHING TO CANCEL, END PNR FIRST), 1 hors périmètre (message technique interne),
  1 point business confirmé mais non traité (voir Backlog), 21 encore « à vérifier » sans urgence.
- **DATA-1 corrigé** (repris du Backlog Mission 02) : AN/TN/SN consultent maintenant
  `deps.locations.findByIata()` (nouvelle méthode exposée par `packages/data`) et renvoient
  `NOT IN TABLE` pour un code ville inconnu, quand un provider est configuré. Bug de câblage
  trouvé et corrigé au passage : `resolveDeps` ignorait silencieusement un provider qui n'expose
  que `findByIata` sans `decodeIata`/`searchByText`. Ajout de `PAR` (code ville) aux données
  réelles ; correction d'une course dans `Terminal.jsx` (le fetch de `locations.json` n'était
  attendu que pour DAC/DAN, jamais pour AN/TN/SN) ; mock de fetch ajouté au setup Vitest web.
- **FXR corrigé** : ne doit pas exiger de NM (contrairement à FXP/FXB), confirmé par Massy.
  Contrôle `NO NAME` retiré de FXR (resté correctement absent de FXL).
- Suite core passée de 131 à 137 tests, toutes vertes après chaque fix (core/data/web/e2e/lint/
  typecheck + CI GitHub).

### 05/07/2026 — Mission 02 (close)
- `AUDIT-COMMANDES.md` créé : grille CONSTITUTION §2 pour les ~35 commandes du dispatcher.
- 5 bugs trouvés, corrigés et testés (1 commit par famille) :
  - **SS ne décrémentait jamais l'inventaire de sièges** (`state.lastAN`) → survente/duplication
    de segments illimitée sur la même ligne/classe. C'est l'exemple même cité par
    CONSTITUTION §3. Corrigé : décrément de `paxCount` à chaque vente réussie.
  - **FXP/FXR/FXB tarifaient sans aucun NM dans le PNR** (repris de la session précédente,
    "Bug 5", jamais terminé). Nouvelle erreur `NO NAME`.
  - **AP acceptait un payload vide** sans validation (seule commande PNR sans garde-fou).
    Alignée sur RM/OP/RF/etc. : `CHECK FORMAT` si vide.
  - **VOID re-validait silencieusement un billet déjà void** si son numéro exact était fourni.
    Retourne maintenant `NOTHING TO CANCEL`.
  - **NM-1** : noms avec apostrophe/tiret rejetés (`O'BRIEN`, `JEAN-PIERRE`) — repris de l'ancien
    "Bug 4", confirmé par Massy dans cette mission. Classe de caractères étendue à `[A-Z'-]+`.
- 1 point identifié mais **non corrigé**, documenté dans `AUDIT-COMMANDES.md` et ci-dessous
  (DATA-1 : AN/TN/SN sans validation de code ville — hors périmètre d'un correctif contenu).
- Suite core passée de 123 à 131 tests (8 tests golden ajoutés), toutes vertes après chaque fix.

### 05/07/2026 — Mission 01 (close)
- Déblocage Git : verrous `HEAD.lock`/`index.lock` orphelins supprimés (aucun process git actif),
  `git fsck` propre (seulement des commits "dangling" normaux, tolérés), push des commits en
  attente fait.
- 6 suites/contrôles au vert côté Windows : `test` (123), `test:data` (2), `test:web` (10 Vitest),
  `test:e2e` (8 Playwright), `lint`, `typecheck` core.
- `npm audit fix` : 5 vulnérabilités (@babel/core, brace-expansion, flatted, js-yaml, postcss)
  corrigées sans casse, 0 vulnérabilité restante, suites re-vérifiées au vert après fix.
- Renommage `FIDELI~1.MD` → `FIDELITE_AMADEUS_COMPARAISON.md` (nom court Windows 8.3 committé par
  accident) via `git mv`, aucune référence cassée.
- Triage des 11 branches distantes dormantes : les 11 étaient mergées ou obsolètes, aucun apport
  à préserver. PR #6 fermée avec commentaire (contenu déjà porté en Phase 0). Toutes les branches
  supprimées côté distant ; `git branch -r` = `origin/main` uniquement. Détail :
  - `codex/stabilize-core-first-architecture`, `copilot/lot-2-datastore-clean`,
    `fix/monorepo-workspaces-data`, `lot3-an-offline-improved`,
    `lot4d-pricing-ultra-realistic-taxes`, `refactor-engine`,
    `ux/amadeus-terminal-scroll-anselect-history-alt` : 0 commit unique vs main, déjà mergées.
  - `codex/stabilize-core-first-architecture-oo2898` (PR #2) : DataStore redondant, déjà
    diagnostiqué et fermé sans merge en Phase 0.
  - `lot4-pricing-amadeuslike` : pricing FXP/FXB/FXR/FXL basé sur une architecture pré-refactor
    (`options` au lieu de `deps`) ; refait autrement et mieux sur main (commits PRC-1→5, Lot 4d).
  - `ux/amadeus-mode-b-scroll-an-token-filter` (PR #6) : 6 apports déjà portés manuellement dans
    `Terminal.jsx` en Phase 0.
  - `ux/an-filter-and-class-selection` : filtre compagnie + curseur clignotant déjà livrés
    autrement sur main. Un détail cosmétique non repris → voir Backlog.
- Décision `package-lock.json` (validée par Massy) : committer le lock. Retiré du `.gitignore`,
  `npm install` puis `npm ci` vérifiés localement (0 vulnérabilité, 281 packages), CI GitHub
  Actions basculée de `npm install` vers `npm ci` + cache npm (`actions/setup-node` `cache: npm`).
  Toutes les suites re-vérifiées au vert après le `npm ci` local.
- Rituel de clôture : `TASKS.md` (ce fichier), `CLAUDE.md` et `PROJECT_MEMORY` mis à jour, tout
  commité et poussé sur `main`.

## Backlog

> Amélioration recommandée / idée d'évolution → ne pas implémenter sans validation explicite de
> Massy (CONSTITUTION §5). Bug critique / incohérence → à traiter en priorité dès qu'une mission
> les couvre.

- **Amélioration recommandée** : espacement fixe de 12ch après le `>` du prompt (`.prompt-gap`),
  vu dans la branche supprimée `ux/an-filter-and-class-selection`. Cosmétique, non implémenté —
  à valider avec Massy si jugé utile (pas indispensable à la fidélité Amadeus).
- **Bug critique confirmé, mission dédiée future (SS liste d'attente HL/UC)** : SS refuse
  purement la vente si la classe est à 0 siège ou si le nombre de pax dépasse le disponible.
  **Confirmé par Massy (05/07/2026, Mission 03)** : le vrai Amadeus met en liste d'attente
  (statut de segment `HL`/`UC`) au lieu de refuser. Le simulateur ne crée aujourd'hui que des
  segments statut `HK`. Chantier plus large qu'un wording : revoir la logique SS/statuts de
  segment, l'affichage RT des statuts HL/UC, probablement une commande de confirmation HL→HK.
  Détail dans `docs/ERREURS-AMADEUS.md`. Non traité dans Mission 03 (hors périmètre message).
- **Formulations encore à vérifier** (21 messages, sans urgence, aucun impact fonctionnel connu
  au-delà du texte affiché) : voir la table complète dans `docs/ERREURS-AMADEUS.md`.

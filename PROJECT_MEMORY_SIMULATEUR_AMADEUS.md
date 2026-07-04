# PROJECT_MEMORY_SIMULATEUR_AMADEUS
Simulateur Amadeus GDS – Mémoire officielle (court + long terme)

> Objectif de ce document : permettre à n’importe quel assistant IA / développeur de reprendre le projet
> sans reposer de questions de base, et sans perdre les contraintes, la philosophie, ni l’architecture.

---

## 0) Identité du projet
- Projet : simulateur Amadeus (GDS) en JavaScript
- Forme : terminal (UI web) reproduisant le comportement “Command Page” Amadeus
- Mode : offline, déterministe, pédagogique et métier
- Priorité : fidélité GDS (séquences, erreurs, formats) > UX web moderne

---

## 1) Philosophie et vision
### 1.1 Objectif fondamental
Créer un simulateur Amadeus :
- pédagogique
- métier
- réaliste (95–100%)
- offline mais déterministe
- fidèle au comportement Amadeus, pas à une API moderne

Ce projet n’est PAS :
- un CRUD
- une démo UI
- un moteur de réservation web
- une abstraction “simplifiée”

### 1.2 Fidélité (règle d’or)
Le comportement doit respecter :
- séquence des commandes
- erreurs métier
- contraintes d’état
- formats d’affichage
- effets différés (ex: FXP crée TST mais pas billet)

Interdit :
- “on fait comme si”
- raccourcis logiques
- validations implicites
- auto-création de PNR
- UX web moderne (boutons/formulaires)

---

## 2) Mémoire long terme métier (règles établies)
### 2.1 Hypothèses utilisateur implicites
- utilisateur “GDS-aware”
- saisie texte
- accepte erreurs “cryptiques”
- sait qu’une commande peut échouer selon l’état

### 2.2 PNR (règles)
- Un PNR n’existe PAS tant que ER n’est pas fait
- Le PNR est “en mémoire” tant qu’il n’est pas validé
- ER exige obligatoirement :
  - ≥ 1 NM
  - ≥ 1 AP
  - ≥ 1 RF
- Record Locator généré uniquement à ER

### 2.3 TST / Pricing (règles)
- TST créé uniquement par :
  - FXP
  - FXB
- FXR / FXL / FXX ne créent PAS de TST
- Le TST :
  - est multi-pax
  - est numéroté / structuré par segments
  - est affiché dans RT
- Pricing offline déterministe :
  - prix stables
  - pas d’aléatoire non contrôlé
  - règles tarifaires internes
  - taxes simulées mais réalistes
- FXP ≠ FXB ≠ FXR ≠ FXL ≠ FXX (effets différents)

### 2.4 Conventions de commandes
- case-insensitive
- parsing strict
- format Amadeus exact
- aucune sortie JSON côté utilisateur

Exemples :
- AN15DECALGPAR
- AN15DECALGPAR/AF
- NM1DUPONT/JEAN MR
- RFMM (sans +)
- FXP / FXB / FXR / FXL / FXX
- RT

---

## 3) Architecture (invariants)
### 3.1 Fonction centrale
- `processCommand(input, state, options) -> { events, state }`

### 3.2 Events = seule source d’affichage
- `events` contient uniquement :
  - `{ type: "print", text: "..." }`
  - `{ type: "error", text: "..." }`
Interdit :
- console.log métier
- DOM direct pour la logique métier
- mutation UI en dehors de l’events flow

### 3.3 Découplage strict
- `packages/core` : logique métier pure
- `apps/web` : UI React / rendu terminal
- pas de dépendance inverse (UI -> core uniquement)

---

## 4) State (structure officielle)
### 4.1 State global (modèle attendu)
state = {
  activePNR: PNR | null,
  lastAN: Availability | null,
  tst/tsts: TST[] | null
}

### 4.2 activePNR (structure attendue)
activePNR = {
  passengers: [],
  itinerary: [],
  contacts: [],
  rf: string | null,
  recordLocator: string | null,
  status: "ACTIVE" | "RECORDED"
}

### 4.3 États possibles
- Pas de PNR
- PNR actif non validé
- PNR enregistré (après ER)

---

## 5) Commandes implémentées / support — scope figé "niveau 1-2" (Phase 1, 03/07/2026)

Liste établie par audit du dispatcher (`processCommand` dans `packages/core/src/index.js`), toutes
couvertes par au moins un test dans `packages/core/src/__tests__/` (120 tests golden/invariant +
unitaires, 100% verts). Toute commande retirée ou modifiée ici doit rester couverte par un test
avant merge (voir méthode de travail).

**Aide / info**
- HE, HELP, JD

**Décodage / recherche lieux** (nécessite `deps.locations`)
- DAC (décode IATA), DAN (recherche texte)

**Disponibilité / horaires**
- AN (offline déterministe, filtre compagnie côté UI `AN.../XX`)
- TN (timetable, pagination), SN (schedule)

**Vente / annulation segments**
- SS (vente depuis dernier AN), XE / XE1 / XE1-2 / XEALL (annulation d'éléments/segments)

**PNR (build)**
- NM (MR/MRS + ADT/CHD/INF, NM2+), AP, APE (email), SSR, OSI, RM, OP, RF (format RFMM sans +),
  TKTL, FP
- ER (end & record — exige ≥1 NM, ≥1 AP, ≥1 RF), RT (affichage PNR actif)
- IG / IR (ignore/retrieve), XI (clear PNR actif)
- QP / QD / QE / QN / QR / QS (queue)

**Pricing / TST**
- FXP : garde RBD, crée TST
- FXB : rebook + TST
- FXR : reprice low fare sans TST
- FXL : low fare info only (erreur si indisponible)
- FXX : devis sans TST
- TQT (détail TST), FQN (low fare quote nombre)

**Ticketing**
- ET / TTP (émission), VOID (annulation billet émis), ITR-EML (envoi reçu itinéraire)

Hors scope niveau 1-2 (pas encore implémenté / pas dans ce périmètre figé) : toute commande non
listée ci-dessus.

---

## 6) Scénarios métier de référence (tests / régression)
### Happy Path
AN → SS → NM → AP → RF → FXP → ER → RT

### Séquences invalides (exemples)
- ER sans RF → erreur
- FXP sans itinéraire → erreur
- FXB après ER → erreur
- RT sans PNR → erreur

---

## 7) Contraintes non négociables
- style Amadeus strict
- terminal textuel
- core sans UI
- events only
- tests obligatoires
- aucune magie cachée
- aucune mutation silencieuse

---

## 8) Décisions récentes “structure de travail”
### 8.1 Architecture future recommandée (handlers)
- registry de commandes
- 1 handler = 1 commande
- chaque handler :
  - parse
  - validate
  - retourne `{ nextState, events }`
- tests “scénarios / golden” privilégiés (pas de unit tests inutiles)

### 8.2 Méthode officielle
Spec → Handler → Tests → Intégration → UX ensuite  
Interdit :
- coder sans spec
- UX avant métier
- corriger sans test

---

## 9) Mémoire court terme (session récente)
- Problème VS Code : crash après upgrade (résolu via réinstallation propre + stabilisation)
- Expérimentations cursor/scroll : plusieurs essais (Patch 1/2/3 évoqués)
- Décision : ne pas perdre le travail, tout a été sauvegardé via Git (commit/branche WIP).
- Objectif UX visé : Selling Platform-like (ligne active stable) mais pas finalisé.
- Si besoin : revert complet des expérimentations cursor/scroll et reprise incrémentale.

### 03/07/2026 — Phase 0 (nettoyage)
- PR #2 fermée sans merge (redondante avec `packages/data` déjà sur main).
- PR #6 : 6 apports portés dans `Terminal.jsx` de main (filtre compagnie AN/XX, wrap multi-lignes,
  groupage `anGroupId`, message NO FLIGHTS, `defaultTokenIndex`, scroll via `bottomAnchorRef`).
- Écart assumé vs PR #6 : pas de renumérotation des lignes AN après filtrage compagnie (numéro
  moteur original conservé) — plus fidèle au vrai Amadeus et évite un décalage entre le numéro
  affiché et le numéro attendu par `SS` en cas de saisie manuelle après filtrage.
- Logique de parsing validée par script Node contre `processCommand` réel ; sélection
  clavier/scroll/curseur vérifiés a posteriori via les tests Playwright de la Phase 0.5 (voir
  ci-dessous) — tout fonctionne dans un vrai Chromium.
- Reste en Phase 0 : trancher les autres branches non mergées qui traînent (voir CLAUDE.md).

### 03/07/2026 — Phase 0.5 (outillage)
- Vitest + RTL, `@ts-check`+JSDoc sur `packages/core`, Husky+lint-staged, CI GitHub Actions,
  Playwright : tout en place et vert (détail dans CLAUDE.md).
- La CI a immédiatement attrapé un vrai bug (`react-hooks/set-state-in-effect` sur deux
  `useEffect` de `Terminal.jsx`) invisible en local à cause de `package-lock.json` non committé
  (résolution de version différente entre local et CI). Corrigé en remplaçant les effets par le
  pattern React "ajustement d'état pendant le rendu" + valeurs dérivées — pas juste désactivé le
  lint. Point de vigilance noté dans CLAUDE.md : ce risque de dérive peut se reproduire tant que
  le lock file n'est pas committé.
- Les tests Playwright ont confirmé visuellement que le portage de la PR #6 (Phase 0) fonctionne
  bien dans un vrai navigateur (sélection clavier AN, scroll auto, séquence complète).

### 04/07/2026 — Phase 5, Étape 1 (différenciation des messages `INVALID FORMAT`)
- Nouveau document de référence : `FIDELITE_AMADEUS_COMPARAISON.md` à la racine (comparaison
  simulateur vs vrai Amadeus, doc publique + à valider par l'expérience terrain de Massy).
  Attention : le fichier existe sur disque sous le nom littéral `FIDELI~1.MD` (nom court Windows
  8.3, pas juste un alias d'affichage) — probablement un accident d'outil/copie, à renommer si
  besoin, non corrigé de ma propre initiative.
- `packages/core/src/index.js` : `INVALID FORMAT` entièrement retiré, remplacé par `CHECK FORMAT`
  / `CHECK DATE` / `CHECK CLASS OF SERVICE` / `NOT IN TABLE` selon la cause déjà présente dans le
  code (détail complet dans `FIDELITE_AMADEUS_COMPARAISON.md`, section Étape 1). Aucune nouvelle
  logique de détection ajoutée. `CHECK CITY CODE`/`CHECK FLIGHT NUMBER` non utilisés (pas de cause
  distincte détectable sans toucher à d'autres fichiers).
- Suite complète au vert (122 core + 2 data + 8 web + 8 e2e), 2 tests golden ajoutés pour des
  branches SS jamais testées avant (ligne AN inexistante, classe non proposée sur le vol).
- Étape 2 (format d'en-tête/codes de statut AN) et Étape 3 (RF→historique après ER, nécessite
  validation de Massy avant de coder) pas commencées dans cette session, comme demandé.

---

## 10) Objectif immédiat (prochaine étape recommandée)
Phase 0 (nettoyage PR) et Phase 0.5 (outillage) sont faites (03/07/2026, voir CLAUDE.md et §9).
Prochaine étape : **Phase 1 — Stabilisation du cœur**
1) Figer et documenter le scope des commandes "niveau 1-2" garanties sans bug
2) Tests golden/invariant au vert à 100% (déjà le cas : 120/120 sur `packages/core`)
3) Zéro régression UX connue
Ne pas démarrer les phases 5-8 avant que la Phase 1 soit 100% stable (règle explicite CLAUDE.md).

---

## 11) Prompt de reprise (à coller dans une nouvelle conversation)
COLLER CECI DANS LA NOUVELLE CONVERSATION :

Je reprends un projet “Simulateur Amadeus GDS” (terminal Selling Platform-like).
Le projet est offline et déterministe, orienté formation métier, et doit être fidèle aux règles Amadeus (séquences, erreurs, formats).
Architecture:
- Core pur : processCommand -> { events, state }
- UI React : affichage uniquement via events (print/error)
Contraintes non négociables:
- Pas de logique métier dans l’UI
- Pas de raccourcis “web”
- Parsing strict, Amadeus-like
- Tests scénarios (golden) obligatoires
Objectif actuel:
- Stabiliser l’UI (cursor/scroll) puis reprendre incrémentalement.
Réponds en respectant strictement ce document.


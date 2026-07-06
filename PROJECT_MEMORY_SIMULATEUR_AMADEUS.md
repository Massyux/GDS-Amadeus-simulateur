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

#### Matrice d'états transactionnelle (IG/IR/ER/XI) — figée le 06/07/2026, Mission 15 Étape 0
Établie pour corriger un bug critique signalé par Massy (« IG ne sort pas complètement du PNR et
ne l'ignore pas ») avant toute autre commande de la Mission 15 (CONSTITUTION §3, famille complète).

- **`IG` sur PNR jamais enregistré** (aucun `ER` fait) → le PNR disparaît TOTALEMENT (passagers,
  segments, contacts, TST, tout) ; les sièges vendus via `SS` sont restitués à `state.lastAN` (si
  le contexte de disponibilité est toujours le même — pas de restitution si un `AN` plus récent
  l'a remplacé, aucune donnée fiable où restituer) ; `RT` ensuite → `NO ACTIVE PNR`.
- **`IG` sur PNR déjà enregistré** → tout ce qui a été modifié EN MÉMOIRE depuis le dernier `ER`
  (nouveaux segments `SS`, remarques, OSI, etc.) est jeté ; le PNR revient EXACTEMENT à son
  dernier état enregistré. Seuls les sièges des segments vendus APRÈS ce dernier `ER` sont
  restitués — le(s) segment(s) déjà enregistré(s) restent vendus (le PNR enregistré existe
  toujours tel quel dans `pnrStore`).
- **`IR`** (avec ou sans locator) → même logique que IG, plus réaffichage (`RETRIEVED`). Point
  important : si `IR <AUTRE-LOCATOR>` bascule vers un PNR *différent*, seule la queue non
  enregistrée du PNR qu'on QUITTE est libérée (relative à SON PROPRE dernier `ER`) — jamais les
  segments du PNR différent qu'on rejoint, qui restent valides et inchangés.
- **`ER`/`ET`** → enregistrent le PNR actif (`ET` ne réaffiche pas — écart de fidélité identifié,
  pas encore corrigé, voir `docs/COMMANDES-MANQUANTES.md`).
- **`XI`** → vide le PNR actif en mémoire (comportement actuel : tout, pas juste l'itinéraire —
  écart avec le vrai Amadeus noté dans `docs/COMMANDES-MANQUANTES.md`, pas corrigé ici, hors
  périmètre de l'Étape 0). Même règle de restitution des sièges que IG : seule la part non
  enregistrée depuis le dernier `ER` est libérée, le PNR enregistré reste intact dans `pnrStore`
  et reste récupérable via `IR <LOCATOR>`.
- **Bug racine corrigé** : `resolveRecordedLocator` avait un 3e niveau de repli sur
  `state.lastRecordedLocator`, un pointeur GLOBAL "dernier PNR jamais enregistré dans toute la
  session" — complètement déconnecté du PNR actif courant. Conséquence : after `ER` (PNR A) →
  `XI` → nouveau PNR B jamais enregistré → `IG` résurrectait A au lieu de simplement jeter B. Le
  pointeur global et son champ d'état ont été supprimés ; `resolveRecordedLocator` ne regarde
  plus que le PNR actif courant (son propre `recordLocator`) ou son propre `recordedSnapshot`.
- **Zéro état fantôme vérifié** : après chaque transition ci-dessus, `lastAN` (sièges), `tsts` et
  `pnrStore` ont été audités un par un (voir tests golden `processCommand.test.js` autour de
  « stale locator bug reported by Massy », « zero phantom state », « releases inventory only for
  segments added after ER », « XI releases the seat inventory »).

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
couvertes par au moins un test dans `packages/core/src/__tests__/` (131 tests golden/invariant +
unitaires depuis l'audit métier Mission 02 du 05/07/2026, 100% verts). Toute commande retirée ou
modifiée ici doit rester couverte par un test avant merge (voir méthode de travail).

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
- FXP/FXR/FXB exigent ≥1 NM dans le PNR actif (erreur `NO NAME` sinon, depuis Mission 02
  05/07/2026 — avant cela, tarifiait sans aucun passager)

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

### 05/07/2026 — Mission 01 (hygiène & remise à plat du dépôt)
- Projet déplacé de `C:\Users\MASSI\Desktop\` vers `D:\cowork\GDS-Amadeus-simulateur` (fait par
  l'architecte) ; moteur vérifié sain après déplacement.
- Méthode de travail passée en mode "missions" : plan d'exécution dans `missions/` (rédigé par
  l'architecte Claude Cowork), une mission = une session Claude Code, tracker vivant `TASKS.md`
  créé à la racine. Voir `missions/README.md`.
- Git débloqué (verrous orphelins supprimés, `fsck` propre), 6 suites vertes (123 core + 2 data +
  10 web Vitest + 8 e2e Playwright + lint + typecheck), `npm audit fix` → 0 vulnérabilité.
- `FIDELI~1.MD` renommé en `FIDELITE_AMADEUS_COMPARAISON.md` (résout la note du 04/07/2026 au-dessus).
- Triage complet des branches distantes : PR #6 fermée, 11 branches dormantes supprimées (toutes
  mergées ou obsolètes, aucun apport perdu — détail dans `TASKS.md`). `git branch -r` = `origin/main`.
- `package-lock.json` : décision prise avec Massy → committé (retiré du `.gitignore`), CI passée
  de `npm install` à `npm ci` + cache npm. Résout le point de vigilance du 03/07/2026 (Phase 0.5).

### 05/07/2026 — Mission 02 (audit métier commande par commande)
- `AUDIT-COMMANDES.md` créé : grille CONSTITUTION §2 (nominal/réexéc./mauvais état/limites/
  IG-ER/croisés) déroulée sur les ~35 commandes du dispatcher `processCommand`.
- 5 bugs trouvés, corrigés, testés, un commit par famille (détail dans `TASKS.md`) :
  SS ne décrémentait jamais l'inventaire de sièges (survente/duplication illimitée — l'exemple
  même de CONSTITUTION §3), FXP/FXR/FXB tarifiaient sans NM (repris de l'ancien "Bug 5", jamais
  terminé), AP acceptait un payload vide (seule commande PNR sans garde-fou), VOID revalidait
  silencieusement un billet déjà void par numéro exact, NM rejetait les noms avec apostrophe/tiret
  (repris de l'ancien "Bug 4" — confirmé par Massy dans cette mission avant correction).
- 1 point non corrigé, documenté en Backlog `TASKS.md` : DATA-1 (AN/TN/SN acceptent tout code
  ville à 3 lettres sans consulter `packages/data` — nécessite un couplage cross-package, hors
  périmètre d'un correctif contenu à `packages/core/src/index.js`).
- Suite core : 123 → 131 tests, 100% verts après chaque fix.

### 05/07/2026 — Mission 03 (messages d'erreur fidèles Amadeus)
- `docs/ERREURS-AMADEUS.md` créé : inventaire exhaustif des 30 messages d'erreur de
  `packages/core`. Méthode stricte : rien inventé sans le marquer « à vérifier » ; 4 messages
  déjà conformes (Phase 5 Étape 1), reste soumis à l'arbitrage de Massy.
- **DATA-1 corrigé** (repris du Backlog Mission 02) : AN/TN/SN consultent maintenant
  `deps.locations.findByIata()` (nouvelle méthode `packages/data`) → `NOT IN TABLE` pour un code
  ville inconnu. Bug de câblage trouvé et corrigé au passage (`resolveDeps` ignorait un provider
  n'exposant que `findByIata`). `PAR` ajouté aux données réelles ; course corrigée dans
  `Terminal.jsx` (fetch de `locations.json` pas attendu pour AN/TN/SN avant).
- Décisions de Massy (expérience terrain réelle, à retenir pour la suite) :
  - **FXP et FXB exigent un NM dans le PNR, FXR et FXL non.** Règle métier confirmée — FXR
    corrigé (le contrôle `NO NAME` en avait été ajouté à tort en Mission 02).
  - `NOTHING TO CANCEL` (VOID re-void) et `END PNR FIRST` (message générique) confirmés tels quels.
  - **SS refuse la vente à 0 siège/pax insuffisants ; le vrai Amadeus met en liste d'attente
    (statuts de segment HL/UC) au lieu de refuser.** Confirmé comme un vrai écart business (pas
    seulement de wording) — non traité dans cette mission, proposé comme mission dédiée future
    (voir `TASKS.md` Backlog). Le simulateur ne crée aujourd'hui que des segments statut `HK`.
- Suite core : 131 → 137 tests, 100% verts après chaque fix.

### 05/07/2026 — Mission 04 (fidélité visuelle du terminal)
- `docs/FIDELITE-VISUELLE.md` créé : Massy a comparé le terminal au vrai Amadeus (expérience
  terrain réelle) → **aucun écart visuel signalé**. Aucune modification cosmétique nécessaire.
- **Bug critique trouvé et corrigé pendant la vérification** (non-visuel, hors périmètre mission
  mais corrigé immédiatement — CONSTITUTION §5) : dans `Terminal.jsx`, `splitANFilter()` (filtre
  compagnie `AN.../XX`) était appliqué à **toutes** les commandes soumises, pas seulement AN.
  Toute commande contenant un `/` dont les 2 derniers caractères formaient un motif de 2 lettres
  se faisait tronquer silencieusement avant d'atteindre `processCommand`. Cassait `NM1<nom>/
  <prénom>` (signalé par Massy — le nom est une variable, le bug ne dépendait d'aucun nom
  particulier), `OP<date>/<texte>`, `TKTL/<date>`. Corrigé : le split ne s'applique que si la
  commande commence par `AN`.
- Un test Playwright existant passait par accident depuis le début (vérifiait la ligne échouée
  affichée à l'écran, jamais le contenu réel du PNR) — corrigé pour vérifier le Record Locator.
- Suite web : 10 → 11 tests Vitest, 8 Playwright inchangés, tout vert après le fix.

### 06/07/2026 — Mission 05 (déploiement public, avec Massy)
- Déployé : **https://gds-amadeus-simulateur.pages.dev/** (Cloudflare Pages, projet classique
  connecté au repo GitHub). Redéploiement automatique sur push `main` confirmé (plusieurs push
  testés). Séquence complète AN→SS→NM→AP→RF→ER→RT vérifiée en production.
- Deux bugs distincts trouvés et corrigés pendant le déploiement (aucun n'était visible avant
  d'essayer réellement de déployer) :
  1. Premier essai a créé un **Worker** (flux Cloudflare unifié "Workers & Pages") au lieu d'un
     projet Pages classique → échec (`wrangler deploy` ne savait pas quoi déployer dans le
     monorepo). Résolu en recréant en Pages classique (config : `build_command: npm run
     build:web`, `destination_dir: apps/web/dist`, `root_dir: /`).
  2. Le titre affiché en prod restait celui par défaut de Vite ("frontend") malgré des
     déploiements réussis. Fausses pistes explorées (cache de build Cloudflare, comportement
     `emptyOutDir` du bundler expérimental `rolldown-vite`) avant de trouver la vraie cause :
     `apps/web/index.html` (titre/lang/description corrects) était une modification locale
     **jamais committée**, probablement depuis la session Phase 2 onboarding. Corrigé en la
     committant. Leçon : toujours vérifier `git status` en début de session/tâche, même quand on
     pense repartir d'un état propre.

### 06/07/2026 — Mission 06 (accès par clé + habillage commercial v1, Phase 3)
- Aucune règle métier `packages/core` touchée (mission 100% web/infra) — noté ici pour la
  continuité de session, pas parce qu'une règle a changé.
- Accès public désormais gardé par clé (`GDS-XXXX-XXXX`) : validation serveur (Cloudflare Pages
  Function `functions/api/verify-key.js`, hachés SHA-256 en variable d'environnement Cloudflare,
  jamais en clair) + repli client documenté et accepté (`VITE_FALLBACK_KEY_HASHES`, vide par
  défaut, usage tests uniquement). Terminal jamais monté sans clé validée. Détail complet dans
  `CLAUDE.md` Phase 3 et `README.md` §Gestion des clés.
- Page d'accueil devenue une vraie page marketing FR/EN (`Onboarding.jsx` + `i18n/dictionary.js`)
  — le terminal (`Terminal.jsx`, `packages/core`) reste intact et en anglais Amadeus-authentique.
- `scripts/generate-keys.mjs` : outil Node autonome pour Massy (génération + CSV clés en clair,
  gitignored).

---

## 10) Objectif immédiat (prochaine étape recommandée)
Missions 01 à 06 sont closes (06/07/2026 — voir §9 et `TASKS.md`). **Jalon v1.0 atteint**
(déploiement public fonctionnel, cf. `CLAUDE.md` Phase 2) et **Phase 3 (offre commerciale v1)
close** : accès par clé en production, page d'accueil FR/EN.
Prochaine étape : mission 07 (lancement pilote + traitement des retours, Phase 4) ou toute autre
priorité que Massy souhaite donner — voir `missions/README.md`. Point notable en Backlog pour une
mission future dédiée : SS liste d'attente HL/UC (confirmé par Massy, chantier business plus
large qu'un correctif de message).

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


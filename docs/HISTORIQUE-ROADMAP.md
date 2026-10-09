# Historique de la roadmap et de la reprise initiale

> **Extrait de `CLAUDE.md` le 09/10/2026 par l'architecte, sans rien supprimer.**
>
> Pourquoi : `CLAUDE.md` est le fichier de mémoire chargé **automatiquement à chaque session**.
> Il pesait 33 Ko, dont 285 lignes de phases déjà cochées et d'archéologie de deux PR fermées en
> juillet. Ce contenu se repayait à chaque démarrage sans jamais servir.
>
> Ce fichier contient : le contexte de la reprise du 03/07/2026 (audit à distance, sort des
> PR #2 et #6) et la roadmap complète Phases 0 → 8 avec l'état de chaque case.
>
> **Ne pas le charger pour se mettre en contexte.** L'état courant et la reprise exacte sont
> dans `TASKS.md` ; les décisions en vigueur dans `CLAUDE.md` ; le détail daté de chaque session
> dans `JOURNAL.md`. Ce fichier-ci ne sert qu'à répondre à une question sur le plan d'origine.

---

## Contexte de reprise (03/07/2026)

Le projet a été audité à distance (lecture du repo public via GitHub, sans clone local, faute
d'accès disque à ce moment). Constat :

- **Main** est sain : moteur `packages/core` fonctionnel, `packages/data` (DataStore/InMemoryStore)
  déjà intégré, terminal React (`apps/web/src/Terminal.jsx`) avec scroll auto-follow, sélection
  clavier des lignes AN, Enter → SS. Tests golden/invariant niveau 1-2 en place.
- **2 PR ouvertes depuis ~5-6 mois, jamais tranchées** — c'est le vrai blocage à lever en premier,
  avant tout nouveau développement.

### Phase 0 — statut : ✅ FAIT (03/07/2026)

### PR #2 — `codex/stabilize-core-first-architecture-oo2898` (agent Codex)
**Fermée sans merge** le 03/07/2026 (via `gh pr close 2 --comment ...`), branche conservée.
Diagnostic confirmé : redondante avec `packages/data` déjà sur main.

### PR #6 — `ux/amadeus-mode-b-scroll-an-token-filter`
**Apports portés dans `apps/web/src/Terminal.jsx` de main le 03/07/2026** (branche PR #6 non
mergée — main avait divergé, un merge Git direct aurait conflicté). Portage manuel des 6 items :

1. Filtre compagnie sur AN — syntaxe `AN.../XX` (`normalizeAirlineFilter`, `splitANFilter`) ✅
2. Gestion des lignes de disponibilité qui wrappent sur plusieurs lignes (`AVAIL_WRAP_RE`,
   regroupement `line1` + `wraps`) ✅
3. Groupage des résultats AN par `anGroupId` ✅
4. Message `NO FLIGHTS` quand le filtre ne matche rien ✅
5. Sélection par défaut du premier token avec des sièges disponibles (`defaultTokenIndex`) ✅
6. Curseur clignotant CSS (déjà présent sur main) + `scrollIntoView({block:"end"})` via
   `bottomAnchorRef` (remplace la manipulation manuelle de `scrollTop`) ✅

**Écart volontaire par rapport à la PR #6 :** pas de renumérotation des lignes affichées après
filtrage compagnie (la PR #6 renumérotait 1,2,3... après filtre). Le numéro de ligne original du
moteur (`lineNo`) est conservé tel quel à l'affichage, pour deux raisons : fidélité au vrai
Amadeus (qui ne renumérote pas), et évite un bug where une commande `SS` tapée manuellement avec
le numéro affiché aurait échoué (le moteur indexe toujours par numéro original, pas par position
filtrée). Validé par un script Node exécutant `processCommand` réellement (AN sur ALG-PAR : 8
vols AT/SV, wrap sur 3 lignes, filtre `/AT` garde les lignes 1,4,6,7 sans les renuméroter,
filtre sans match affiche bien `NO FLIGHTS`).

**Non vérifié visuellement** (pas d'outil de pilotage navigateur disponible dans cet
environnement) : sélection clavier (flèches), curseur clignotant, auto-scroll en conditions
réelles dans le navigateur. À valider manuellement avant de considérer la Phase 0 totalement
close, ou lors de l'ajout des tests UI en Phase 0.5.

## Roadmap complète jusqu'à la fin du projet

**Phase 0 — Nettoyage** ✅ fait (03/07/2026, dernier reliquat clos le 05/07/2026 — Mission 01)
- [x] Fermer PR #2 sans merge
- [x] Porter les 6 apports utiles de PR #6 dans le Terminal.jsx de main
- [x] Repo propre : zéro branche/PR qui traîne — fait le 05/07/2026 (`missions/MISSION-01.md`,
  détail dans `TASKS.md`) : PR #6 fermée avec commentaire, 11 branches distantes dormantes
  supprimées (toutes mergées ou obsolètes, aucun apport perdu), `git branch -r` = `origin/main`

**Phase 0.5 — Outillage** ✅ fait le 03/07/2026
- [x] Tests UI (Vitest + React Testing Library) sur `apps/web` (`Terminal.test.jsx`, 6 tests)
- [x] `// @ts-check` + JSDoc sur `packages/core` (`tsconfig.json`, `npm run typecheck`, 0 erreur)
- [x] Husky + lint-staged (`.husky/pre-commit` : lint-staged puis les 3 suites de tests, bloque
  le commit si l'un échoue — validé sur de vrais commits de cette session)
- [x] CI GitHub Actions (`.github/workflows/ci.yml` : lint, typecheck, tests, e2e — vert sur
  `ubuntu-latest`). A immédiatement attrapé un vrai bug (`react-hooks/set-state-in-effect` sur
  `Terminal.jsx`, invisible en local faute de `package-lock.json` committé — voir note ci-dessous)
- [x] Playwright (`apps/web/e2e/terminal.spec.js`, 6 scénarios : banner, AN + sélection clavier,
  filtre compagnie, Enter→SS, séquence complète AN→SS→NM→AP→RF→ER→RT, auto-scroll) — a permis de
  vérifier visuellement dans un vrai Chromium ce qui n'avait pas pu être testé manuellement en
  Phase 0 faute d'outil de pilotage navigateur

⚠️ **Point de vigilance découvert pendant cette phase :** `package-lock.json` était gitignored,
ce qui pouvait faire résoudre des versions différentes entre CI et local (déjà causé un faux rouge
avec `eslint-plugin-react-hooks`). **Résolu le 05/07/2026 (Mission 01, validé par Massy)** : lock
retiré du `.gitignore`, committé, CI basculée de `npm install` à `npm ci` + cache npm.

**Phase 1 — Stabilisation du cœur** ✅ fait le 03/07/2026
- [x] Scope figé et documenté des commandes "niveau 1-2" garanties sans bug (voir
  PROJECT_MEMORY §5 — audit complet du dispatcher `processCommand`, chaque commande listée est
  couverte par au moins un test)
- [x] Tests golden/invariant au vert à 100% (120 `packages/core` + 2 `packages/data` + 6 `apps/web`
  Vitest + 6 `apps/web` Playwright e2e — tout vert, plus `typecheck` propre)
- [x] Zéro régression UX connue (pas de TODO/FIXME en suspens dans le code, rien de signalé dans
  la mémoire court terme au-delà de ce qui a été traité en Phase 0)

**Phase 2 — Packaging** — en cours (03-04/07/2026)
- [x] Build de prod vérifié (`npm run build:web` → 244 KB / 75 KB gzip, aucune erreur)
- [x] Page d'accueil/onboarding minimale (`apps/web/src/Onboarding.jsx`) : présentation du
  projet, disclaimer de non-affiliation Amadeus, 3 commandes d'exemple, bouton d'entrée, choix
  mémorisé en `localStorage`. Testé Vitest (`App.test.jsx`) + Playwright (`e2e/onboarding.spec.js`)
- [x] Déploiement public ✅ (Mission 05, 05-06/07/2026, avec Massy sur son compte Cloudflare) :
  **https://gds-amadeus-simulateur.pages.dev/** — projet Pages classique (`build_command:
  npm run build:web`, `destination_dir: apps/web/dist`, `root_dir: /`), connecté au repo GitHub,
  redéploiement automatique sur push `main` **confirmé** (plusieurs push ont chacun déclenché un
  déploiement). Séquence complète AN→SS→NM→AP→RF→ER→RT vérifiée en production (Record Locator
  généré, onboarding + disclaimer visibles). Phase 2 close → **jalon v1.0 atteint**.
  - Premier essai parti sur le flux unifié "Workers & Pages" (créait un Worker, pas un projet
    Pages) → `wrangler deploy` échouait sans config ; ajout de `wrangler.jsonc` (assets-only),
    puis recréation en Pages classique par Massy — a résolu le déploiement lui-même.
  - Bug séparé découvert ensuite : le titre affiché en prod restait "frontend" (template Vite par
    défaut) malgré plusieurs redéploiements. Cause réelle : `apps/web/index.html` (titre/lang/
    description corrects, probablement du travail Phase 2 onboarding) n'avait **jamais été
    committé** — restait un changement local non poussé pendant tout ce temps. Corrigé en le
    committant. (Deux commits intermédiaires ajoutant `emptyOutDir`/un script `prebuild` pour
    nettoyer `dist/` avant chaque build restent en place par hygiène — ils ne sont pas la cause
    réelle mais ne nuisent pas.)

**Phase 3 — Offre commerciale v1** — ✅ fait (06/07/2026, Mission 06)
- Produit vendu = bundle "Formation Amadeus + accès simulateur" (pas le simulateur seul)
- Accès simple pour la v1 (clé/lien privé), pas de système de comptes complexe
- [x] Accès par clé (`GDS-XXXX-XXXX`) : validation serveur via Cloudflare Pages Function
  (`functions/api/verify-key.js`), hachés SHA-256 en variable d'environnement Cloudflare
  (`ACCESS_KEY_HASHES`), jamais de clé en clair dans le repo ni dans le bundle livré au
  navigateur. Terminal jamais monté sans clé validée (`localStorage
  simulateur-amadeus:access-key-valid`), y compris en appelant l'app directement.
  `scripts/generate-keys.mjs` génère les clés + un CSV en clair (dossier `keys/`, gitignored) ;
  doc d'usage (ajout/révocation sans toucher au code) dans `README.md` §Gestion des clés.
- **Repli client documenté** (prévu explicitement par la mission, pas une improvisation) : une
  variable de build `VITE_FALLBACK_KEY_HASHES` (mêmes hachés) permet une validation côté
  navigateur si les Pages Functions sont un jour bloquées. Vide par défaut → inactive en
  production tant que Massy ne la configure pas lui-même. Utilisée uniquement pour les tests
  (Vitest + Playwright + CI), avec une clé de test `GDS-TEST-0001` qui n'est pas un vrai secret.
  Delibérément moins robuste que la validation serveur (les hachés finiraient dans le bundle si
  jamais activée en prod) — acceptable pour un pilote, à n'activer qu'en cas de besoin réel.
- [x] Page d'accueil enrichie (`Onboarding.jsx`) : proposition de valeur + public cible
  (étudiants/écoles de tourisme), aperçu du terminal réel-rendu (composant statique non
  interactif réutilisant les classes CSS du vrai terminal, pas une image), bouton "J'ai une clé
  d'accès", bouton "Demander un accès" (mailto vers massinissa.mehdani@gmail.com — canal e-mail
  choisi par Massy), disclaimer conservé.
- [x] FR/EN léger (`apps/web/src/i18n/dictionary.js`, dictionnaire JSON plat, pas de lib i18n),
  FR par défaut, bascule mémorisée en localStorage. Ne couvre que l'enveloppe (accueil + écran de
  clé) — le terminal reste en anglais Amadeus-authentique (décision confirmée le 05/07/2026).
- [x] Tests : unitaires (`lib/keyHash.test.js`), Vitest UI (`AccessGate.test.jsx`,
  `App.test.jsx`), Playwright e2e (`e2e/onboarding.spec.js` étendu) — tous verts, CI ne dépend
  d'aucun secret réel (haché de test injecté en variable d'environnement du job e2e).

**Phase 4 — Lancement test**
- Groupe pilote restreint (étudiants tourisme / audience TikTok FikraDZ si pertinent)
- Itération sur retours avant lancement large
- [x] **Mission 07 Partie A close (07/07/2026)** — préparation technique : analytics Cloudflare
  Web Analytics sans cookies (`apps/web/src/analytics.js`, actif seulement si Massy configure
  `VITE_CF_BEACON_TOKEN` sur Cloudflare Pages — inactif par défaut, aucun script externe chargé
  tant que ce n'est pas fait) ; bouton Feedback discret (mailto pré-rempli version+écran) sur
  l'accueil et le terminal ; guide de démarrage rapide FR/EN imprimable (bouton « ? », mêmes deux
  emplacements), listant les commandes de base et la séquence complète AN→SS→NM→AP→RF→ER. Le
  terminal lui-même reste en anglais Amadeus-authentique (non touché). Détail dans `TASKS.md`.
- [ ] **Mission 07 Partie B** (checklist opérationnelle Massy — génération/configuration des
  clés, recrutement de 5-15 pilotes, suivi dans `docs/PILOTE.md`) : pas encore lancée.

**Phase 5 — Fidélité ~99% avec le vrai Amadeus Selling Platform**
- [x] Pré-requis (Mission 02, 05/07/2026) : audit métier commande par commande, 5 bugs corrigés
  et testés (voir `AUDIT-COMMANDES.md`, `TASKS.md`) — le cœur métier est stable avant de peaufiner
  la fidélité
- [x] Messages d'erreur (Mission 03, 05/07/2026) : inventaire complet (`docs/ERREURS-AMADEUS.md`),
  DATA-1 corrigé (codes ville AN/TN/SN validés), FXR/FXP/FXB alignés sur le vrai comportement NM
  (confirmé par Massy). Reste : mission dédiée future pour SS liste d'attente HL/UC (confirmé
  comme un vrai écart business, voir `TASKS.md` Backlog)
- [x] Fidélité visuelle (Mission 04, 05/07/2026) : Massy a comparé au vrai logiciel, **aucun écart
  visuel** (`docs/FIDELITE-VISUELLE.md`). A révélé un bug critique non-visuel corrigé au passage :
  le filtre compagnie AN tronquait silencieusement NM/OP/TKTL dès qu'ils contenaient un `/`
- Design, terminal, look, logique de travail, codes d'erreur et algorithme métier aussi proches
  que possible du vrai logiciel
- ⚠️ Recréer l'apparence "à la main" (pas de captures d'écran ni d'assets réels Amadeus copiés),
  garder un disclaimer de non-affiliation — risque IP distinct du sujet du nom (trade dress)
- [x] **Chaîne d'implémentation v1.x — TERMINÉE (07/07/2026), missions 15, 16, 17 réduite, 13 et
  19 réduite closes** :
  décision Massy du 06/07/2026 de compléter TOUTES les commandes manquantes avant le pilote,
  chaîne allégée le 07/07/2026 (triage Massy + architecte, voir `missions/README.md`
  §ALLÈGEMENT et §CHAÎNE D'IMPLÉMENTATION, `docs/COMMANDES-MANQUANTES.md`). Mission 15
  (servicing du PNR actif) : bug critique IG/IR/XI (pointeur global périmé + inventaire jamais
  restitué, signalé par Massy) corrigé en premier ; 8 commandes ajoutées (VOID→TWD/TWX, SS long
  sell, SB, modification par n°, NU, DL, SI ARNK, TKOK/TKXL). Mission 16 (navigation &
  affichages) : correction fidélité `ET` (Étape 0, tranchée par l'architecte — `ET` partage la
  logique de `ER` mais sans réafficher et sans émettre de billet, seul `TTP` le fait) puis
  `MD`/`MU`/`MT`/`MB` (pagination `state.lastDisplay`, état CORE), `MN`/`MY` (même dispo jour
  suivant/précédent), `AC`/`SC`/`ACR` (modifier/inverser le dernier affichage, spec architecte à
  8 règles déterministes), `RE`/`RE2` (rappel des dernières entrées, état CORE
  `state.commandHistory`). `RT` partiels **reportés en v2** (décision Massy 06/07/2026, spec
  conservée dans `MISSION-16.md` pour plus tard). Mission 17 réduite (utilitaires agent) :
  `DD` (calculateur de dates, pur calcul), `DC` (pays/nationalité) et `DNA` (compagnies) —
  ces deux dernières via de nouvelles tables `packages/data` (`countries.json`,
  `airlines.json`), même architecture DI que `deps.locations` pour DAC/DAN. DO/DF/DNE/DB/DM et
  JI/JO **reportés en v2**. Mission 13 (statuts de segment & liste d'attente, écart business
  confirmé par Massy en Mission 03) : spec validée par Massy en début de session (modèle
  HK/HL/KK/KL/UC/UN/NO tel quel, promotion FIFO par vol) ; `SS`/SS long sell waitlistent (`HL`)
  sur classe pleine au lieu de refuser, `...PE` force le waitlist explicite ; `XE`/`DL` libèrent
  l'inventaire et promeuvent le premier `HL` du même vol en `KL` (gatée par la disponibilité
  réelle de sa propre classe) ; `ETK`/`ERK` (jumeaux de `ET`/`ER`) entérinent KK/KL→HK et
  suppriment UC/UN/NO ; `n/HK`\|`HL`\|`KK`\|`KL`\|`UC`\|`UN`\|`NO` permet un override manuel.
  **2 bugs critiques corrigés au passage** (même famille, CONSTITUTION §3) : `XE` ne libérait
  jamais l'inventaire d'un segment annulé (contrairement à IG/DL/SB/XI, découvert en creusant la
  promotion de liste d'attente) ; `SS` long sell reconstruisait une disponibilité fraîche à
  chaque appel au lieu de réutiliser le contexte existant (comme `SB`), écrasant silencieusement
  l'inventaire déjà entamé sur un 2e long sell du même vol. Détail complet dans `TASKS.md`.
  Mission 19 réduite (PNR enregistrés & multi-PNR) : question de persistance posée en début de
  session (comme demandé par la mission) — Massy a confirmé en mémoire pour la session de
  travail uniquement, pas de localStorage. Le magasin de PNR (`state.pnrStore`) existait déjà
  côté `packages/core` (alimenté par `ER`/`ET`/`ERK`/`ETK` depuis les missions précédentes) et a
  été exposé via `RT<LOCATOR>`, `RT/<NOM>` et `RT<AA><vol>/<ddMMM>-<NOM>` (liste de similitude si
  plusieurs correspondances, `RT<n>` sélectionne, `RT0` réaffiche), même matrice transactionnelle
  que `IR`. `RH`, `SP`/`EF`/`RTAXR`, `RRN`/`RRI`/`RRP` **reportés en v2**. Mission 18 (sièges
  SM/ST/SX) et Mission 20 **entièrement reportées en v2**. Détail complet dans `TASKS.md`.
  **Chaîne d'implémentation terminée** — prochaine étape : Mission 07 (lancement pilote, Phase 4).

**Phase 6 — Moteur d'exercices et quiz**
- Scénarios guidés type "fais-moi une réservation de X à Y", "annule le billet numéro ..."
- Évaluation automatique de la séquence de commandes attendue
- [x] **Mission 08 (partie 1 : moteur d'exercices guidés) CLOSE dans son ensemble (25/07/2026)**
  — les 4 étapes (spec + moteur, contenu 1-4 + UI, contenu 5-10 + indices/barème/polissage,
  rituel de clôture final + production vérifiée) sont toutes closes. Détail par étape ci-dessous,
  historique complet dans `TASKS.md`. Partie 2 (quiz/notation/progression) = Mission 09, pas
  encore commencée.
- [x] **Mission 08 Étape 1 close (16/07/2026)** : nouveau package pur `packages/exercises`
  (même architecture que `packages/core`), format JSON d'exercice documenté (`titre`/`consigne`
  bilingues, `seedState`, `objectifs[]`, `jalonsTrace[]`, `aides[]`) et moteur
  `evaluate(exercise, finalState, commandTrace, options)` — évaluation **par l'état final**, pas
  par la séquence exacte (deux chemins valides différents réussissent tous les deux, testé
  golden). 7 types d'objectif couverts (`pnr-recorded`, `segment-count`, `route`,
  `passenger-name`, `tst-present`, `ticket-issued`, `element-status`). Aucune UI, aucun contenu
  d'exercice réel encore écrit — c'est l'Étape 2. Détail dans `TASKS.md`.
- [x] **Mission 08 Étape 2 close (16/07/2026)** : contenu réel des 4 premiers exercices FR/EN
  (`packages/exercises/content/*.json` : lecture de disponibilité, décodage, première vente,
  dossier complet), 2 extensions mineures de l'évaluateur (filtre `airline` sur `route`, type
  d'objectif `tk-set`). UI mode exercice dans `apps/web` : `Terminal.jsx` réutilisable sans
  changement visuel/comportemental en mode libre (`forwardRef`/`useImperativeHandle` +
  `initialState` optionnel), `ExercisePicker`/`ExercisePanel` (consigne repliable, Vérifier/
  Indice/Abandonner, résultat par objectif), entrée « Mode exercices » sur l'accueil **derrière
  la même clé d'accès que le mode libre** (les exercices font tourner le vrai terminal complet,
  pas de bypass gratuit du modèle commercial Mission 06). FR/EN via le dictionnaire existant.
  Détail complet (dont le point de fidélité vérifié sur le filtre `AN.../XX`, UI-only et non un
  vrai filtre du dispatcher) dans `TASKS.md`.
- [x] **Mission 08 Étape 3 close (24/07/2026)** : contenu réel des exercices 5-10 FR/EN — vente
  directe (long sell), retrouver/modifier un dossier existant (`RT` locator/nom + `SB`), corriger
  des erreurs (`NU`/`DL`/`XE`/`IG`), tarifer et émettre (`FXP`/`FP`/`TTP`/`TWD`), liste d'attente
  (`SS...PE` + `ETK`), dossier de synthèse complet. Même rigueur que 1-4 (deux chemins valides +
  un échec typique par exercice, tout vérifié contre le vrai moteur avant rédaction). « Chronométré »
  (exercice 10) traité comme un défi personnel dans le texte de consigne, pas un minuteur
  applicatif — aucun changement d'UI pour cette étape, conforme à son périmètre décrit.
  **Bug réel trouvé et corrigé** : `applySeedState` ne clonait pas profondément `seedState`, donc
  les objets imbriqués (ex: `pnrStore`) restaient partagés par référence avec l'exercice importé
  une seule fois — une première tentative pouvait corrompre l'exercice pour la suivante (`ER`
  mute `state.pnrStore` en place). Corrigé avec `structuredClone`, testé en régression. Détail
  complet dans `TASKS.md`.
- [x] **Mission 08 Étape 4 close (25/07/2026)** : rituel de clôture final. `e2e/exercises.spec.js`
  étendu pour résoudre les 10 exercices de bout en bout dans un vrai navigateur (auparavant seul
  l'exercice 3 avait une preuve e2e directe, les 9 autres n'étaient couverts que par les tests
  golden `packages/exercises`), 12 nouveaux tests (12→24 e2e au total). **Production vérifiée** :
  le hash du bundle JS déployé sur Cloudflare Pages est identique à celui du build local testé
  (même contenu, même taille) et contient bien les 10 identifiants/titres d'exercice — confirme
  que le déploiement reflète tout le contenu de l'Étape 3, pas une version périmée. Limite
  assumée et documentée (pas contournée) : le parcours réel de validation de clé (Cloudflare
  Pages Function) n'a pas pu être re-testé en production faute d'une vraie clé (seul Massy en
  détient) — la suite e2e locale tourne contre le même artefact de build que celui déployé
  (`npm run build:web`), ce qui couvre tout le reste du parcours. 6 suites vertes (268 core,
  9 data, 47 exercises, 41 web, 24 e2e, lint et typecheck propres). Détail complet dans
  `TASKS.md`.

**Phase 7 — Assistant IA intégré**
- Chat pour poser des questions librement
- Tooltip contextuel au survol (2s) d'un code/segment → explication (taxe, code d'erreur, etc.)
- Aide à la correction de commande / faute de frappe
- Explications pédagogiques à la demande

**Phase 8 — Site de vente avec licensing par poste**
- Hébergement du système complet
- Lien à usage unique = un seul poste de travail, OU compte multi-postes (2 à 4 postes) selon
  le palier d'abonnement acheté (comme le vrai Amadeus)
- [x] **Mission 14 (espace admin + licences par poste) CLOSE dans son ensemble** : anticipée par
  décision de Massy (06/07/2026) pour être prête avant la vente large, indépendamment de l'ordre
  normal des phases. Architecture changée en cours de route par l'architecte (07/07/2026) :
  **Cloudflare D1** au lieu de Supabase (même compte que Pages, aucun tiers). Schéma
  (`migrations/0001_init.sql` : `licenses` + `activations`), 7 Cloudflare Pages Functions
  (`license/activate` avec limite de postes et messages différenciés, `license/check` avec
  révocation instantanée, `admin/*` CRUD avec auth par phrase secrète — `ADMIN_SECRET_HASH`, pas
  de Supabase Auth), UI `/admin` (`apps/web/src/admin/`, routage par pathname sans dépendance
  routeur), empreinte appareil documentée avec ses limites honnêtes (`docs/LICENCES.md`). Testé
  sur 3 couches (18 tests d'intégration contre un vrai `wrangler pages dev` + D1 local, tests
  composants, 4 tests Playwright dédiés contre le même D1 local — `vite preview` ne fait pas
  tourner les Functions). **Bascule production (Étape 3) faite et vérifiée le 28/07/2026** :
  `AccessGate.jsx` branché sur `/api/license/activate`/`/api/license/check`, aucune clé pilote à
  migrer (Mission 07 Partie B jamais lancée à cette date), 2 bugs de déploiement corrigés le même
  jour. **Reconfirmée vivante le 06/10/2026** après 4 mois d'arrêt (audit de reprise, `AUDIT.md` :
  `/api/license/check` répond toujours en production). Le reliquat trouvé par cet audit (code
  mort `verify-key.js`/`ACCESS_KEY_HASHES`/`VITE_FALLBACK_KEY_HASHES`, gardé volontairement « le
  temps de vérifier la bascule ») a été retiré le 06/10/2026 — Mission 14 n'a donc plus aucun
  reliquat. Détail complet dans `TASKS.md`.

Règle stricte : ne jamais démarrer une phase avant que la précédente soit testée et mergée. Phases
5 à 8 ne commencent pas avant que la Phase 1 (cœur niveau 1-2) soit 100% stable.


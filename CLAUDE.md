# CLAUDE.md — Simulateur Amadeus (GDS-Amadeus-simulateur)

> À déposer à la racine du repo local (`GDS-Amadeus-simulateur/CLAUDE.md`), à côté de
> `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md`. Ce fichier ne remplace pas PROJECT_MEMORY (qui reste
> la référence architecture/philosophie/règles métier) — il donne le contexte de reprise,
> la roadmap de commercialisation et la méthode de travail. Claude Code lit ce fichier
> automatiquement au démarrage d'une session dans ce dossier.

## Constitution du projet (à lire et appliquer en premier)

@CONSTITUTION.md

Gouvernance commune à tous les assistants IA du projet (Claude Code, Claude Cowork) : rôles,
philosophie qualité, règle d'or des familles de bugs, classification des observations
(bug critique / incohérence / amélioration / idée), périmètre v1.0, règles de finalisation.
Intégrée le 05/07/2026 à la demande de Massy.

## Missions exécutables (05/07/2026)

Le plan d'exécution mission par mission vit dans `missions/` (voir `missions/README.md` : mode
d'emploi, séquence 01→11, règles de clôture). Une session Claude Code = une mission. La roadmap
produit ci-dessous reste la référence ; les missions en sont la déclinaison opérationnelle,
rédigées et auditées par l'architecte (Claude Cowork).

## Décisions produit (Massy, 05/07/2026)

- **Distribution v1** : web hébergé + accès par clé/lien privé (pas d'app à télécharger en v1)
- **Référence fidélité Amadeus** : pas d'accès live — souvenirs de Massy + manuels/docs publics ;
  tout message/détail incertain est marqué « à vérifier » et arbitré par Massy, jamais inventé
- **Langues de l'enveloppe pédagogique** : français + anglais (le terminal reste en anglais
  Amadeus authentique)
- **Périmètre v1.0 vendable** : commandes niveau 1-2 actuelles (cycle réservation complet) ;
  tarification complète et billetterie = v1.x après lancement
- **Infra v1 (05/07/2026)** : pas de base de données (app 100% client, localStorage) ;
  hébergement statique gratuit — Cloudflare Pages en premier choix (bande passante illimitée),
  Vercel/Netlify en alternative ; domaine optionnel au début (sous-domaine gratuit), .com
  (~12 $/an, Cloudflare Registrar ou Porkbun) au moment de vendre. Phase 6+ : Supabase (gratuit,
  Postgres + auth) pour comptes/clés/progression ; paiement Algérie : Chargily Pay (CIB/EDAHABIA)
- **Chaîne d'implémentation (06/07/2026)** : décision Massy — implémenter TOUTES les commandes
  manquantes (docs/COMMANDES-MANQUANTES.md) AVANT le pilote. Ordre : missions 15→16→17→13→18→
  19→20 en enchaînement continu avec non-régression après chaque commande (protocole dans
  missions/README.md §Chaîne). Le pilote (mission 07) attend la fin de chaîne.
- **Bug critique signalé par Massy (06/07/2026)** : IG ne sort pas complètement du PNR / ne
  l'ignore pas entièrement. Traité en ÉTAPE 0 de MISSION-15 (matrice transactionnelle complète
  IG/IR/ER/ET/XI à refondre et tester).
- **Licences & admin (06/07/2026)** : espace admin + verrouillage par poste construits APRÈS le
  pilote (pilote = clés actuelles tracées à la main), obligatoires AVANT la vente large.
  Politique : paliers dès le départ — individuel (1 poste) et école (2-4 postes), liaison
  clé↔appareils via Supabase (voir MISSION-14).
- **Mode API réel AN/SN (05/07/2026)** : validé comme évolution v1.x — provider
  `providers/availability/amadeus.js` (API Amadeus Self-Service « Flight Availabilities
  Search », Massy a déjà une clé) derrière un proxy serverless gratuit (clé jamais côté client,
  cache des réponses). Le provider sim déterministe RESTE le défaut : indispensable à la
  correction automatique des exercices (Phase 6). Mode réel = option démo/premium.

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
- [x] **Chaîne d'implémentation v1.x — Mission 15 close (06/07/2026)** : décision Massy du
  06/07/2026 de compléter TOUTES les commandes manquantes avant le pilote (ordre
  `15→16→17→13→18→19→20`, voir `missions/README.md` §CHAÎNE D'IMPLÉMENTATION et
  `docs/COMMANDES-MANQUANTES.md`). Mission 15 (servicing du PNR actif) : bug critique IG/IR/XI
  (pointeur global périmé + inventaire jamais restitué, signalé par Massy) corrigé en premier ;
  8 commandes ajoutées (VOID→TWD/TWX, SS long sell, SB, modification par n°, NU, DL, SI ARNK,
  TKOK/TKXL). Détail complet dans `TASKS.md`. Point non traité, à trancher : la correction de
  fidélité `ET` (mentionnée dans `docs/COMMANDES-MANQUANTES.md` et le libellé de la mission, mais
  absente de la liste numérotée réelle de `MISSION-15.md`) — voir `TASKS.md` Backlog. Enchaînement
  immédiat sur Mission 16 (règle de la chaîne, pas d'arrêt entre missions du chantier).

**Phase 6 — Moteur d'exercices et quiz**
- Scénarios guidés type "fais-moi une réservation de X à Y", "annule le billet numéro ..."
- Évaluation automatique de la séquence de commandes attendue

**Phase 7 — Assistant IA intégré**
- Chat pour poser des questions librement
- Tooltip contextuel au survol (2s) d'un code/segment → explication (taxe, code d'erreur, etc.)
- Aide à la correction de commande / faute de frappe
- Explications pédagogiques à la demande

**Phase 8 — Site de vente avec licensing par poste**
- Hébergement du système complet
- Lien à usage unique = un seul poste de travail, OU compte multi-postes (2 à 4 postes) selon
  le palier d'abonnement acheté (comme le vrai Amadeus)

Règle stricte : ne jamais démarrer une phase avant que la précédente soit testée et mergée. Phases
5 à 8 ne commencent pas avant que la Phase 1 (cœur niveau 1-2) soit 100% stable.

## Outillage recommandé pour Claude Code (réduire les bugs, pas les garantir)

Aucun outil ne garantit "zéro bug" — ce qui marche, c'est un système qui rattrape les erreurs vite,
avant qu'elles arrivent sur main. D'où cette liste :

**Déjà en place**
- ESLint (`apps/web`) — lancer `npm run lint` régulièrement
- `node --test` sur `packages/core` et `packages/data` — tests golden/invariant
- Vitest + React Testing Library sur `apps/web` (`npm run test:web`)
- `// @ts-check` + JSDoc sur `packages/core` (`npm --prefix packages/core run typecheck`)
- Husky + lint-staged (`.husky/pre-commit`)
- CI GitHub Actions (`.github/workflows/ci.yml`)
- Playwright (`npm run test:e2e`)

Tout ce qui était listé "à ajouter (Phase 0.5)" est fait (voir détail dans la section Phase 0.5
de la roadmap ci-dessus, y compris le point de vigilance sur `package-lock.json`).

**Côté Claude Code (VS Code)**
- Un hook Claude Code qui relance `npm test` automatiquement après chaque édition de fichier, pour
  voir immédiatement si un changement casse quelque chose
- `CLAUDE.md` (ce fichier) déjà en place comme mémoire de contexte
- Pas de "skill" Claude Code spécifique nécessaire pour ce projet — les skills servent plutôt à des
  tâches comme la génération de documents. Le vrai levier ici, c'est la combinaison tests + lint +
  hooks + CI ci-dessus, appliquée strictement à chaque tâche (voir méthode de travail ci-dessous)

## Méthode de travail (à respecter strictement)

Une tâche à la fois, jamais deux en parallèle. Pour chaque tâche :

1. Spec courte (qu'est-ce qui change, pourquoi, critères d'acceptation)
2. Handler/code
3. Tests (golden en priorité — pas de tests unitaires superflus, voir PROJECT_MEMORY §8.2)
4. Intégration
5. UX en dernier
6. **Merger tout de suite** — pas de branche qui vit plus d'une session de travail
7. Mettre à jour `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` (règles/état) et `TASKS.md` (avancement)

Objectif explicite : ne jamais reproduire le pattern des PR #2/#6 — des branches qui dorment
6 mois faute de décision. Fermer la boucle à chaque session.

## Profil du porteur de projet (contexte utile)

Massy — introverti, exigeant sur la qualité (refuse le générique), temps limité (service national
en cours), a du mal à prioriser entre ses nombreux projets mais revient toujours sur celui-ci.
Préfère des sessions courtes et régulières avec un livrable clair plutôt que du scope flou.

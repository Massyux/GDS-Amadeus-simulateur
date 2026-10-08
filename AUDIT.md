# AUDIT — Simulateur Amadeus GDS

> Audit réalisé le 05/10/2026 après une reprise de projet suite à 4 mois d'arrêt. Lecture complète
> du code et de la documentation, analyse de l'historique git, installation des dépendances,
> exécution de toutes les suites de tests disponibles (unitaires, intégration, e2e) et build de
> production. **Aucun fichier existant n'a été modifié** — ce document est le seul fichier créé.

---

## 1. Vue d'ensemble

### À quoi sert le projet
Un simulateur de terminal GDS (Global Distribution System) reproduisant fidèlement l'Amadeus
Selling Platform : mêmes commandes, mêmes formats, mêmes codes d'erreur. Objectif commercial :
vendre une formation (étudiants/écoles de tourisme) avec accès au simulateur par clé de licence,
plus un moteur d'exercices guidés auto-corrigés. Le terminal lui-même reste volontairement en
anglais Amadeus authentique ; l'enveloppe pédagogique (accueil, guide, accès) est en français et
anglais.

### Technologies
- **Monorepo npm workspaces** (`apps/*`, `packages/*`), Node 24 (v24.14.0 installé et utilisé avec
  succès), aucun framework serveur classique.
- **`packages/core`** : moteur pur `processCommand(state, cmd) -> { events, state }`, zéro
  dépendance runtime, `// @ts-check` + JSDoc, tests via `node --test` (pas de framework de test).
- **`packages/data`** : `DataStore`/`InMemoryStore`, fournisseurs de données (villes, pays,
  compagnies) injectés dans `packages/core` par dependency injection.
- **`packages/exercises`** : moteur d'évaluation d'exercices (`evaluate()`), dépend de
  `packages/core`, zéro UI.
- **`apps/web`** : React 19 + Vite (via `rolldown-vite`), Vitest + React Testing Library,
  Playwright pour les e2e, ESLint. Terminal, écran d'accès, admin, guide de démarrage, i18n maison
  (dictionnaire JSON plat, pas de lib i18n).
- **Cloudflare Pages Functions** (`functions/api/*`) : API serverless pour la validation de clé
  (legacy) et le système de licences/admin (Mission 14), **Cloudflare D1** (SQLite) comme base de
  données (`migrations/0001_init.sql`), **Wrangler** pour le dev local et le déploiement.
- **Outillage qualité** : Husky + lint-staged (pre-commit : lint + 3 suites de tests), CI GitHub
  Actions (`.github/workflows/ci.yml`) couvrant lint, typecheck, toutes les suites de tests et les
  deux suites e2e Playwright.
- **Hébergement** : Cloudflare Pages, déploiement statique + Functions, domaine
  `gds-amadeus-simulateur.pages.dev` (site en ligne et fonctionnel au moment de l'audit, vérifié
  par requête HTTP — titre de page correct).

### Architecture
Séparation stricte cœur/UI : `packages/core` ne connaît rien de React ; `apps/web/src/Terminal.jsx`
ne fait qu'appeler `processCommand` et afficher les `events` renvoyés (print/error), sans aucune
logique métier côté UI. `apps/web/src/App.jsx` orchestre les écrans (onboarding → accès par clé →
terminal/exercices ; `/admin` routé séparément via `window.location.pathname` dans `main.jsx`, sans
dépendance routeur). Les Cloudflare Functions sous `functions/api/` parlent directement à D1 via
le binding `DB` (jamais exposé côté client) ; `functions/_lib/` contient les helpers partagés
(hash, token signé HMAC, garde d'auth admin). Le dépôt est accompagné d'une documentation de
gouvernance inhabituellement complète pour un projet de cette taille : `CONSTITUTION.md` (rôles et
règles qualité), `CLAUDE.md` (roadmap et contexte de reprise), `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md`
(règles métier détaillées), `TASKS.md` (journal d'avancement), `missions/` (specs exécutables
mission par mission).

---

## 2. Ce qui est terminé et fonctionne

Vérifié en exécutant réellement les suites (voir détail des commandes en §6) — tout est vert sauf
l'exception notée en §4 :

| Suite | Résultat | Fichiers concernés |
|---|---|---|
| `packages/core` (moteur) | **268/268 ✅** | `packages/core/src/index.js` (4327 lignes), `__tests__/*.js` |
| `packages/data` | **9/9 ✅** | `packages/data/src/index.js` |
| `packages/exercises` | **47/47 ✅** | `packages/exercises/src/*`, `content/*.json` |
| `apps/web` (Vitest) | **49/49 ✅** (11 fichiers) | `apps/web/src/*.jsx`, `*.test.jsx` |
| `apps/web` lint (ESLint) | **propre ✅** | — |
| Typecheck `core` + `exercises` | **propre ✅** | `tsconfig.json` de chaque package |
| Build de production | **✅** (313,78 kB / 94,58 kB gzip) | `npm run build:web` |
| `functions/__tests__` (licences, vrai Wrangler + D1) | **19/19 ✅** | `functions/__tests__/license-api.test.js` |
| e2e Playwright principal | **24/24 ✅** | `apps/web/e2e/*.spec.js` |
| e2e Playwright admin | **2/4** ⚠️ (voir §4a) | `apps/web/e2e-admin/admin.spec.js` |

Fonctionnalités opérationnelles confirmées par ces tests et par lecture du code :
- **Moteur de commandes niveau 1-2 complet** : AN/SS (y compris long sell)/NM/AP/RF/ER/RT, listes
  d'attente HL/KK/KL/UC/UN/NO avec promotion FIFO (XE/DL/IG libèrent l'inventaire), ETK/ERK,
  navigation/affichage MD/MU/MT/MB/MN/MY/AC/SC/ACR, rappel RE/RE2, multi-PNR (`RT` par locator, par
  nom, par vol/date), utilitaires agent DD/DC/DNA.
- **Moteur d'exercices** (`packages/exercises`) : 10 exercices jouables FR/EN de bout en bout,
  évaluation par état final (pas par séquence exacte), vérifiés en vrai navigateur (Playwright).
- **Terminal React** : sélection clavier des lignes AN, filtre compagnie `AN.../XX`, auto-scroll,
  curseur clignotant, mode exercice intégré sans dégrader le mode libre.
- **Accès par clé de licence** (`apps/web/src/AccessGate.jsx` + `accessKey.js`) : confirmé par
  lecture du code que l'écran d'accès appelle bien `/api/license/activate` et `/api/license/check`
  (système D1 de la Mission 14), **pas** l'ancien système `verify-key.js`/`ACCESS_KEY_HASHES` —
  voir §3 et §5 pour le détail de cette bascule et son état de documentation.
- **Espace admin** (`/admin`) : connexion par phrase secrète (token signé HMAC, `functions/_lib/token.js`),
  tableau des licences, création/révocation/prolongation, détail des appareils activés, export CSV
  — 19 tests d'intégration contre un vrai D1 passent, y compris les cas limites (limite de postes
  1/1 et 4/4, révocation instantanée, réactivation, libération d'un poste).
- **Sécurité des endpoints** (lu en détail, voir §5) : hachage SHA-256 des clés/phrases, aucune clé
  en clair stockée, requêtes SQL paramétrées (aucune injection trouvée), comparaison à temps
  constant pour la vérification de signature de token, délai minimum uniforme pour éviter
  l'énumération de clés valides.
- **Pipeline qualité** : CI GitHub Actions structurée et complète (lint → typecheck → 6 suites de
  tests → 2 suites e2e), hooks pre-commit fonctionnels.
- **Déploiement production actif** : `https://gds-amadeus-simulateur.pages.dev/` répond, titre de
  page correct (« Simulateur GDS — Formation Amadeus »), cohérent avec le code local.

---

## 3. Ce qui est commencé mais inachevé

- **Bascule Mission 14 Étape 3 (licences en production) — faite en code et déployée, mais le
  journal de suivi n'a jamais été refermé.** L'historique git montre que `AccessGate.jsx` a bien
  été basculé sur le système D1 (commit `ff6a652`, 28/07/2026), que 2 bugs de déploiement ont été
  corrigés le même jour (`40e8ed9`), qu'un bug de connexion admin a été corrigé (`3b3398d`) et que
  le `README.md` a été clarifié en conséquence (`9430c9d`). Le `README.md` actuel affirme même
  explicitement : *« En production depuis l'Étape 3 (27/07/2026) : base créée, schéma appliqué,
  binding DB actif, ADMIN_SECRET_HASH configuré, AccessGate.jsx branché »*. **Mais** `TASKS.md`
  (section « En cours », lignes 7-43) et `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` (§10 et §11)
  affirment toujours que *« l'Étape 3 (bascule production) [est] volontairement non commencée »*
  et la décrivent comme bloquée sur des actions manuelles de Massy. Autrement dit : le travail a
  été fait, mais le rituel de clôture de session (mettre à jour `TASKS.md`/`PROJECT_MEMORY`,
  règle explicite de `CLAUDE.md` §Méthode de travail point 7) n'a pas été appliqué à la fin de la
  session du 28/07/2026. **Ce décalage documentation/réalité est la découverte la plus importante
  de cet audit** — voir le point de clôture recommandé en §4d et §7.
- **Nettoyage du système de clés legacy** (`functions/api/verify-key.js`, `ACCESS_KEY_HASHES`,
  `VITE_FALLBACK_KEY_HASHES`) : confirmé mort par grep (plus aucune référence dans
  `apps/web/src`), déjà identifié comme tel dans `README.md`/`TASKS.md`, mais pas encore supprimé.
- **Mission 07 Partie B** (checklist opérationnelle : générer les clés pilote, recruter 5-15
  testeurs, consigner les retours) : jamais lancée — c'est une tâche pour Massy, pas pour une
  session de code.
- **Mission 09** (quiz/notation/progression, Phase 6 partie 2) et **Mission 10** (assistant IA
  pédagogique, Phase 7) : seulement esquissées dans `missions/README.md`, aucun code écrit.
- **Items explicitement reportés en v2** (décisions déjà prises, pas des oublis) : `RT` partiels,
  `DO/DF/DNE/DB/DM`, `JI/JO`, `RH`, `SP/EF/RTAXR`, `RRN/RRI/RRP`, cartes de sièges `SM/ST/SX`,
  Mission 18 et Mission 20 en entier. Documentés dans `CLAUDE.md`/`TASKS.md` Backlog.
- **Point métier non tranché** : interaction `FXP`/`TTP` avec un segment `HL`/`UC` non confirmé —
  noté comme backlog dans `PROJECT_MEMORY` §10, jamais implémenté ni explicitement refusé.

---

## 4. Bugs et erreurs

### a) [Gravité moyenne] Suite e2e admin fragile — pollution de données entre runs locaux
**Fichiers** : [apps/web/playwright.admin.config.js:32-34](apps/web/playwright.admin.config.js#L32-L34),
[apps/web/e2e-admin/admin.spec.js:30-50](apps/web/e2e-admin/admin.spec.js#L30-L50)

**Constaté en direct pendant cet audit** : 2 des 4 tests échouent avec
`strict mode violation: getByText(...) resolved to 2 elements`. Cause : le `webServer.command` de
`playwright.admin.config.js` lance `wrangler pages dev` **sans** `--persist-to`, donc il réutilise
le D1 local persistant du dépôt (`.wrangler/state/v3/d1/...`, déjà présent sur disque avant même
que cet audit ne lance quoi que ce soit — accumulé sur plusieurs sessions de dev manuel). Les
licences fixtures nommées « Client E2E » et « Client Revoke E2E » (créées par chaque run du test,
jamais nettoyées) s'accumulent ; dès qu'il en existe deux avec le même nom, les locators Playwright
(`getByText("Client E2E")`) deviennent ambigus et le test casse. À l'inverse,
`functions/__tests__/testServer.js` fait les choses correctement : il utilise `mkdtempSync` +
`--persist-to` pour un D1 jetable par run (voir lignes 2-4, 32, 36 de ce fichier). Invisible en CI
(checkout neuf = D1 vide à chaque fois), ce qui explique que ça n'a jamais été vu dans les suites
vertes documentées dans `TASKS.md`.

**Correction proposée** : appliquer le même pattern `--persist-to` + répertoire temporaire dans
`playwright.admin.config.js`, ou à défaut vider les tables (`DELETE FROM licenses;`) avant chaque
run, ou rendre les noms de fixtures uniques (suffixe timestamp) et resserrer les locators.

### b) [Critique — sécurité, hors code source] Fichier `pharase-secret` à la racine du dépôt
**Fichier** : `pharase-secret` (racine, non suivi par git)

Un fichier texte brut à la racine du dépôt contient ce qui ressemble à une vraie phrase secrète
(probablement liée à l'admin `/admin`). Il n'est **pas encore commité** (`git status` le liste
comme « untracked »), mais rien dans `.gitignore` ne l'empêcherait d'être ajouté par un futur
`git add -A`/`git add .` — et le dépôt GitHub est **public** (`Massyux/GDS-Amadeus-simulateur`,
vérifié via `gh repo view`). Si ce fichier est un jour commité, le secret se retrouve exposé
publiquement et irrévocablement dans l'historique git.

**Correction proposée** : sortir ce fichier du dossier du projet (gestionnaire de mots de passe,
ou au moins un dossier hors du dépôt) dès que possible. Ne **pas** se contenter de l'ajouter au
`.gitignore` : ce n'est qu'un filet de sécurité, le vrai problème est sa présence dans le dossier
versionné. Si la phrase y a déjà été copiée-collée ailleurs (ex. historique de terminal, presse-
papier), envisager de la régénérer via `node scripts/generate-admin-secret.mjs`.

### c) [Mineur — sécurité] Comparaison non constante-temps pour la phrase admin
**Fichier** : [functions/api/admin/login.js:32](functions/api/admin/login.js#L32)

`if (hash === configuredHash)` compare deux chaînes hexadécimales avec l'opérateur `===` standard,
qui s'arrête à la première différence (micro-fuite de timing). Incohérent avec le soin apporté
juste à côté dans `functions/_lib/token.js` (comparaison XOR caractère par caractère, à temps
constant, pour la vérification de signature). Risque réel très faible (un seul admin, délai
minimum de 300 ms déjà imposé qui noie largement le signal), mais facile à corriger pour la
cohérence.

**Correction proposée** : réutiliser le même motif de comparaison à temps constant que
`verifyToken` dans `token.js`, ou extraire un helper partagé.

### d) [Mineur — documentation, mais à fort impact pour la reprise] `TASKS.md` et `PROJECT_MEMORY` périmés
**Fichiers** : [TASKS.md:7-43](TASKS.md#L7-L43), section « 10) Objectif immédiat » de
`PROJECT_MEMORY_SIMULATEUR_AMADEUS.md`

Détaillé en §3 : ces deux fichiers décrivent encore Mission 14 Étape 3 comme non commencée, alors
que 4 commits postérieurs (28/07/2026) et le `README.md` lui-même la décrivent comme faite et
vérifiée en production. Ce n'est pas un bug fonctionnel, mais c'est le genre d'incohérence que la
`CONSTITUTION.md` elle-même classe comme faute à corriger (« une incohérence est un bug »)
puisque ce sont précisément les fichiers que toute session future (humaine ou IA) lit en premier
pour savoir où reprendre.

**Correction proposée** : mettre à jour la section « En cours » de `TASKS.md` et le §10/§11 de
`PROJECT_MEMORY` pour refléter la clôture réelle de l'Étape 3 et de Mission 14 dans son ensemble,
après confirmation de Massy que la production fonctionne toujours comme décrit (voir §8).

### e) [Mineur] Décompte de tests web légèrement différent de la documentation
**Fichier** : `TASKS.md` (ligne ~14, « 51 web »)

`TASKS.md` indique 51 tests web après la Mission 14 ; l'exécution réelle de `npm run test:web`
pendant cet audit en montre 49 (11 fichiers). Écart mineur, probablement un ajustement de tests
non reporté dans le journal — aucune suite ne plante, juste à réconcilier la prochaine fois que
`TASKS.md` est mis à jour.

---

## 5. Problèmes de sécurité et mauvaises pratiques

- **Voir §4b** — le fichier `pharase-secret` est le point le plus urgent de tout l'audit.
- **13 vulnérabilités `npm audit`** (4 moyennes, 9 hautes), toutes situées dans l'arbre des
  **devDependencies** (`vitest`/`@vitest/mocker`, `wrangler`/`miniflare`/`sharp`/`undici`,
  `vite`/`postcss`/`browserslist`, `brace-expansion`, `js-yaml`, `nanoid`). Aucune dans les
  dépendances de production (`apps/web` n'a que `react`/`react-dom` en prod ; les trois packages
  internes n'ont aucune dépendance runtime). Risque réel contenu à l'outillage de build/test local
  et CI, pas livré aux utilisateurs finaux. À traiter par confort/hygiène (`npm audit fix` puis
  relancer toutes les suites), pas en urgence.
- **Code mort confirmé** : `functions/api/verify-key.js` + `ACCESS_KEY_HASHES` +
  `VITE_FALLBACK_KEY_HASHES` — plus aucune référence côté `apps/web/src` (vérifié par recherche).
  Déjà identifié par l'équipe elle-même comme « à retirer dans un nettoyage séparé » — confirmation
  que c'est désormais sans risque de le faire.
- **Bonnes pratiques déjà en place, à souligner** (pas des problèmes, mais notables pour un projet
  individuel) : aucun secret réel en clair dans le code suivi par git ; `.dev.vars`, `keys/`,
  `.wrangler/` correctement dans `.gitignore` ; toutes les requêtes D1 observées sont paramétrées
  (aucune injection SQL trouvée) ; hachage SHA-256 systématique des clés/phrases secrètes, jamais
  stockées en clair ; délai minimum uniforme sur les endpoints d'auth (anti-timing/énumération) ;
  `wrangler.jsonc` documente explicitement, avec l'historique de l'incident, que son `database_id`
  n'est pas un secret.
- **Fichier `keys/1783301937488.csv`** : contient une clé pilote réelle (1 ligne), correctement
  gitignoré. Non lu en détail dans cet audit (pour ne pas manipuler un vrai secret) — signalé pour
  mémoire, voir question en §8.
- **Taille de `packages/core/src/index.js`** (4327 lignes, dispatcher unique pour toutes les
  commandes) : purement une observation de maintenabilité, pas un bug — entièrement testé (268
  tests), fonctionne. Classée « amélioration recommandée » selon `CONSTITUTION.md` §5 : à ne pas
  retoucher sans validation explicite de Massy.
- **Duplication volontaire et documentée** : `normalizeKey`/`sha256Hex` existent à la fois dans
  `functions/api/verify-key.js` et `functions/_lib/hash.js`. Ce n'est pas un oubli — le commentaire
  en tête de `hash.js` explique que c'est pour ne jamais risquer de casser le chemin d'accès pilote
  déjà en prod en touchant à un fichier partagé. Deviendra une vraie duplication à supprimer une
  fois `verify-key.js` retiré (§4/§7).

---

## 6. Comment lancer le projet

### Prérequis
- Node.js 24.x (v24.14.0 utilisé avec succès pour cet audit), npm 11.x.
- Aucune base de données externe à installer : Cloudflare D1 est simulé en local par Wrangler.

### Installation
```bash
npm install
```
Déjà vérifié par cet audit : installation à jour, 315 paquets, aucune erreur bloquante (seulement
les vulnérabilités `npm audit` listées en §5, sans impact sur l'installation elle-même).

### Lancer le frontend seul (mode libre/exercices, sans licences/admin)
```bash
npm run dev:web
```

### Lancer l'environnement complet (terminal + licences + admin, 100% local)
Commande donnée par `README.md`, vérifiée fonctionnelle pendant cet audit (build + tests qui en
dépendent passent) :
```bash
npm run build:web && npx wrangler d1 execute gds-licences --local --file=migrations/0001_init.sql && npx wrangler d1 execute gds-licences --local --file=scripts/seed-e2e-test-license.sql && npx wrangler pages dev apps/web/dist --port 8788
```
Puis ouvrir `http://localhost:8788` : `GDS-TEST-0001` sur l'écran d'accès (`/`), la phrase
`test-admin-secret` sur `/admin` (valeur de test fixée dans `.dev.vars`, gitignoré).

### Tests
```bash
npm run test:core        # 268 tests — ✅ vérifié
npm run test:data        # 9 tests — ✅ vérifié
npm run test:exercises   # 47 tests — ✅ vérifié
npm run test:web         # 49 tests — ✅ vérifié
npm run test:functions   # 19 tests (vrai Wrangler + D1) — ✅ vérifié
npm run test:e2e         # 24 tests Playwright — ✅ vérifié
npm run test:e2e:admin   # 4 tests Playwright — ⚠️ 2/4 échouent (voir §4a)
```

### Variables d'environnement
- **Local** : aucune à créer — `.dev.vars` existe déjà (gitignoré), contient un
  `ADMIN_SECRET_HASH` de test documenté comme tel.
- **Production** (déjà configurées selon `README.md`/l'historique git, à reconfirmer avec Massy —
  voir §8) : `ADMIN_SECRET_HASH` (phrase admin réelle, générée par
  `scripts/generate-admin-secret.mjs`), binding D1 `DB` (déjà câblé dans `wrangler.jsonc` vers la
  base de production), `VITE_CF_BEACON_TOKEN` (optionnel, analytics). `ACCESS_KEY_HASHES`/
  `VITE_FALLBACK_KEY_HASHES` existent encore mais sont inutilisées (legacy, voir §3/§5).

### Ce qui bloque actuellement
Rien ne bloque le développement local : toutes les suites tournent, le build réussit, le site de
production répond. Le seul point rouge est la suite e2e admin (§4a), qui est une fragilité de test
local, pas un bug produit. Le point le plus important à vérifier avant toute nouvelle session de
code n'est pas technique mais factuel : confirmer avec Massy que la bascule Mission 14 Étape 3 est
toujours active en production (voir §8), puisque la documentation interne du projet affirme encore
le contraire de ce que montre l'historique git.

---

## 7. Plan pour terminer le projet (priorisé)

1. **[Critique · sécurité · difficulté triviale, ~5 min]** Sortir `pharase-secret` du dossier du
   dépôt (§4b).
2. **[Critique pour la cohérence du projet · difficulté triviale, ~20 min]** Remettre à jour
   `TASKS.md` (section « En cours ») et `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md` (§10/§11) pour
   refléter la clôture réelle de Mission 14 — après avoir confirmé avec Massy que la production
   est toujours dans l'état décrit par le `README.md` (§4d, §8).
3. **[Moyen · difficulté facile, ~30 min]** Corriger l'isolation de la suite e2e admin
   (`--persist-to` ou purge de table avant run) pour qu'elle redevienne fiable en local (§4a).
4. **[Mineur sécurité · difficulté triviale, ~10 min]** Comparaison à temps constant dans
   `admin/login.js` (§4c).
5. **[Nettoyage · difficulté facile, ~30 min]** Supprimer `verify-key.js`, `ACCESS_KEY_HASHES`,
   `VITE_FALLBACK_KEY_HASHES` — déjà planifié par l'équipe, confirmé mort par cet audit.
6. **[Maintenance · difficulté facile à moyenne]** `npm audit fix` (devDependencies uniquement) +
   relancer toutes les suites pour confirmer l'absence de régression.
7. **[Décision produit, pas technique]** Choisir la prochaine mission avec Massy une fois (1)-(2)
   faits : relancer le pilote (Mission 07 Partie B), ou démarrer Mission 09 (quiz/notation) ou
   Mission 10 (assistant IA) — les trois options sont déjà esquissées dans `missions/README.md`,
   aucune n'est techniquement bloquée.
8. **[Amélioration, pas urgent]** Si la maintenabilité de `packages/core/src/index.js` (4327
   lignes) devient un problème concret un jour, en discuter avec Massy avant toute refonte — ne
   rien faire de ce côté sans validation explicite (`CONSTITUTION.md` §5).

---

## 8. Questions pour moi (Massy)

1. **Mission 14 Étape 3 est-elle toujours active en production ?** Le dernier commit qui en parle
   date du 28/07/2026 (connexion admin réelle testée, bugs de déploiement corrigés). Rien depuis
   ne le reconfirme après 4 mois d'arrêt, et les fichiers de suivi du projet (`TASKS.md`,
   `PROJECT_MEMORY`) disent même l'inverse par erreur. Avant de relancer une nouvelle mission,
   veux-tu qu'on revérifie ensemble (connexion `/admin`, activation d'une vraie clé) ?
2. **Le fichier `pharase-secret` à la racine** — c'est une note personnelle qui doit rester
   strictement locale, c'est bien ça ? Veux-tu que je m'en débarrasse maintenant que l'audit est
   terminé, ou préfères-tu le faire toi-même ?
3. **Priorité business pour la prochaine session** : relancer le pilote (Mission 07 Partie B,
   recrutement de testeurs), ou avancer sur Mission 09 (quiz/notation/progression) ou Mission 10
   (assistant IA pédagogique) ? `CLAUDE.md` laisse les trois options ouvertes.
4. **La clé pilote dans `keys/1783301937488.csv`** — toujours en usage, ou à considérer périmée
   après ces 4 mois d'arrêt (et donc à révoquer depuis `/admin` si la bascule D1 est bien en
   prod) ?

Pas de question technique bloquante sur l'architecture elle-même : le code est cohérent, bien
testé et bien documenté — les points ci-dessus relèvent du calibrage produit et de la vérification
d'un état de production qui a évolué sans que le journal de suivi ne soit refermé.

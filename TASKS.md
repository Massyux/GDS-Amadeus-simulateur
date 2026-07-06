# TASKS — Simulateur Amadeus GDS

> Tracker vivant exigé par `CLAUDE.md` §Méthode de travail (mis à jour à chaque session/mission).
> Classification des observations selon `CONSTITUTION.md` §5 : bug critique / incohérence
> fonctionnelle / amélioration recommandée / idée d'évolution.

## En cours

_(aucune — Mission 05 close, voir ci-dessous)_

## Fait (par session, datée)

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

# CLAUDE.md — Simulateur Amadeus (GDS-Amadeus-simulateur)

> À déposer à la racine du repo local (`GDS-Amadeus-simulateur/CLAUDE.md`), à côté de
> `PROJECT_MEMORY_SIMULATEUR_AMADEUS.md`. Ce fichier ne remplace pas PROJECT_MEMORY (qui reste
> la référence architecture/philosophie/règles métier) — il donne le contexte de reprise,
> la roadmap de commercialisation et la méthode de travail. Claude Code lit ce fichier
> automatiquement au démarrage d'une session dans ce dossier.

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

**Phase 0 — Nettoyage** ✅ fait le 03/07/2026 (voir détail plus haut)
- [x] Fermer PR #2 sans merge
- [x] Porter les 6 apports utiles de PR #6 dans le Terminal.jsx de main
- [ ] Repo propre : zéro branche/PR qui traîne — reste à trancher les autres branches non mergées
  (`fix/monorepo-workspaces-data`, `refactor-engine`, `lot3-an-offline-improved`,
  `lot4-pricing-amadeuslike`, `lot4d-pricing-ultra-realistic-taxes`,
  `copilot/lot-2-datastore-clean`, `ux/amadeus-terminal-scroll-anselect-history-alt`,
  `ux/an-filter-and-class-selection`) — non demandé dans cette session, à traiter séparément

**Phase 0.5 — Outillage** (avant d'écrire la moindre nouvelle fonctionnalité — voir section
"Outillage recommandé" ci-dessous pour le détail)
- Tests UI (Vitest + React Testing Library) sur `apps/web`
- `// @ts-check` + JSDoc sur `packages/core` (typage léger sans migration TS complète)
- Husky + lint-staged (bloque un commit si lint/tests échouent)
- CI GitHub Actions (lint + tests à chaque push/PR)
- Playwright pour les scénarios bout-en-bout du terminal (scroll, sélection AN, séquences complètes)

**Phase 1 — Stabilisation du cœur**
- Scope figé et documenté des commandes "niveau 1-2" garanties sans bug
- Tests golden/invariant au vert à 100%
- Zéro régression UX connue

**Phase 2 — Packaging**
- Build de prod (`npm run build:web`)
- Déploiement public (Vercel/Netlify — statique, adapté à Vite/React)
- Page d'accueil/onboarding minimale pour un nouvel utilisateur

**Phase 3 — Offre commerciale v1**
- Produit vendu = bundle "Formation Amadeus + accès simulateur" (pas le simulateur seul)
- Accès simple pour la v1 (clé/lien privé), pas de système de comptes complexe

**Phase 4 — Lancement test**
- Groupe pilote restreint (étudiants tourisme / audience TikTok FikraDZ si pertinent)
- Itération sur retours avant lancement large

**Phase 5 — Fidélité ~99% avec le vrai Amadeus Selling Platform**
- Design, terminal, look, logique de travail, codes d'erreur et algorithme métier aussi proches
  que possible du vrai logiciel
- ⚠️ Recréer l'apparence "à la main" (pas de captures d'écran ni d'assets réels Amadeus copiés),
  garder un disclaimer de non-affiliation — risque IP distinct du sujet du nom (trade dress)

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

**À ajouter, dans cet ordre (Phase 0.5)**
1. **Tests UI** — Vitest + React Testing Library sur `apps/web` (aucun test n'existe aujourd'hui
   sur `Terminal.jsx` lui-même ; la majorité des bugs passés étaient des bugs d'UI/interaction)
2. **Typage léger** — `// @ts-check` + JSDoc sur `packages/core`, pas de migration TypeScript
   complète nécessaire ; attrape des erreurs de type avant l'exécution pour un coût quasi nul
3. **Husky + lint-staged** — hook Git qui bloque un commit si lint ou tests échouent
4. **CI GitHub Actions** (`.github/workflows/ci.yml`) — lint + tests à chaque push/PR. C'est ce
   qui aurait évité que les PR #2/#6 dorment 6 mois sans qu'on sache si elles étaient valides
5. **Playwright** — tests bout-en-bout du terminal dans un vrai navigateur (scroll, sélection AN,
   séquences complètes de commandes)

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

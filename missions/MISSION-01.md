# MISSION 01 — Hygiène & remise à plat du dépôt

**Phase** : reliquats 0/0.5 · **Durée cible** : 1 session · **Pré-requis** : aucun

## Contexte

Le projet vient d'être déplacé de `C:\Users\MASSI\Desktop\` vers `D:\cowork\GDS-Amadeus-simulateur`
(05/07/2026, fait par l'architecte). Le moteur est vérifié sain après déplacement (123/123 tests
core + 2/2 data verts). Restent des reliquats d'hygiène jamais traités + les vérifications que
seul l'environnement Windows permet.

## Tâches (dans cet ordre)

### 1. Débloquer Git
- Vérifier s'il reste des verrous : `Get-ChildItem .git -Filter *.lock` et
  `.git/objects/*/tmp_obj_*`. Les supprimer (`Remove-Item -Force`). Puis `git fsck` → aucune
  erreur attendue (les tmp_obj orphelins sont tolérés, les signaler seulement).
- `git push origin main` — 4 commits d'avance attendus (3 fix bugs + constitution). Vérifier
  ensuite `git status` propre et CI GitHub verte sur main.

### 2. Suites de tests complètes côté Windows
- `npm run test`, `npm run test:data`, `npm run test:web`, `npm run lint`,
  `npm --prefix packages/core run typecheck`, puis `npm run test:e2e`.
- Tout doit être vert. Si un test échoue : le corriger AVANT de continuer (priorité absolue,
  CONSTITUTION §4). Si Playwright manque de navigateurs : `npx playwright install chromium`.

### 3. Vulnérabilités npm
- `npm audit fix` (JAMAIS `--force`). Les 5 vulnérabilités connues sont toutes dans l'outillage
  dev (@babel/core, brace-expansion, flatted, js-yaml, postcss) avec fix non cassant disponible.
- Relancer TOUTES les suites de l'étape 2 après le fix. `npm audit` final : 0 vulnérabilité.

### 4. Renommer `FIDELI~1.MD`
- C'est un nom court Windows 8.3 committé par erreur. Lire le fichier, choisir un nom propre et
  descriptif (probablement `FIDELITE_AMADEUS.md`), `git mv`, corriger toute référence éventuelle
  (`git grep FIDELI`).

### 5. Créer `TASKS.md` à la racine
Structure : `## En cours` / `## Fait (par session, daté)` / `## Backlog` (avec classification
constitution : bug critique / incohérence / amélioration / idée). Y reporter l'état de cette
mission. C'est le tracker vivant exigé par la méthode de travail de CLAUDE.md §Méthode.

### 6. Triage des 8 branches distantes dormantes
Pour chacune : `git log origin/main..origin/<branche> --oneline` + diff rapide → décision :
- apports déjà sur main ou obsolètes → supprimer la branche distante (`git push origin --delete`)
- apports encore utiles → NE PAS merger ; lister l'apport dans `TASKS.md` Backlog avec une ligne
  de justification, puis supprimer la branche (le travail utile est tracé, pas perdu).

Branches : `codex/stabilize-core-first-architecture`, `codex/stabilize-core-first-architecture-oo2898`,
`copilot/lot-2-datastore-clean`, `fix/monorepo-workspaces-data`, `lot3-an-offline-improved`,
`lot4-pricing-amadeuslike`, `lot4d-pricing-ultra-realistic-taxes`, `refactor-engine`,
`ux/amadeus-terminal-scroll-anselect-history-alt`, `ux/an-filter-and-class-selection`.
Documenter chaque décision (une ligne) dans `TASKS.md`. Objectif final : `git branch -r` = main
uniquement. (PR ouverte associée le cas échéant : la fermer avec commentaire.)

### 7. Décision `package-lock.json` (avec Massy, en début de session)
Le lock est gitignored → CI et local résolvent des versions différentes (a déjà causé un faux
rouge, voir CLAUDE.md §Phase 0.5). **Recommandation de l'architecte : committer le lock.**
Poser la question à Massy en début de session ; s'il valide : retirer du `.gitignore`, committer,
vérifier CI. S'il refuse : noter la décision dans CLAUDE.md et ne plus la re-proposer.

## Critères d'acceptation
- [ ] `git status` propre, `git push` fait, CI GitHub verte, 0 verrou résiduel
- [ ] 6 suites/contrôles verts (core, data, web, e2e, lint, typecheck) côté Windows
- [ ] `npm audit` : 0 vulnérabilité, suites re-vérifiées après fix
- [ ] Plus de `FIDELI~1.MD` ; nouveau nom référencé proprement
- [ ] `TASKS.md` créé et rempli
- [ ] `git branch -r` ne montre plus que `origin/main` ; décisions tracées
- [ ] Décision lock file prise et appliquée/tracée
- [ ] Rituel de clôture (missions/README.md §Règles) exécuté

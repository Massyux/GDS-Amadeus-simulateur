# Prompt pour Claude Code — Mission 23, Étape 5 (correctif sécurité + attestation + bascule production)

> À coller tel quel dans Claude Code. Rédigé par l'architecte le 10/10/2026 après inspection
> directe du dépôt (`git status -sb`, `wrangler.jsonc`, `functions/_lib/`) et du dashboard
> Cloudflare. Dernière étape de la Mission 23.

---

Bonjour. **Mission 23, Étape 5** — la dernière. Lis d'abord `CONSTITUTION.md`, `CLAUDE.md`,
`TASKS.md` et `missions/MISSION-23.md`.

⚠️ **Cette étape n'est PAS en mode autonome**, contrairement aux étapes 0 à 4. Elle touche à la
production en ligne et à un secret que Massy seul doit manipuler. Les points d'arrêt marqués
**🛑 STOP** sont obligatoires : tu t'arrêtes, tu montres, tu attends une réponse explicite.

**Contexte à connaître avant de commencer**, vérifié par l'architecte :

- Il y a **14 commits locaux non poussés** (toute la Mission 23). Rien de la plateforme n'est
  en ligne : orionisacademy.com sert encore la version d'avant (simulateur + accès par clé),
  et elle fonctionne.
- **Cloudflare Pages est connecté au dépôt GitHub : `git push` EST le déploiement.** Il n'y a
  pas de bouton séparé. Donc `git push` est la toute dernière action de cette session, après
  une autorisation explicite, et jamais avant que l'infrastructure soit prête.
- **La documentation a été réorganisée le 09/10/2026** (commit `8fb0e6d`) : `TASKS.md` ne
  contient plus que l'état courant, l'historique daté est dans `JOURNAL.md`, la roadmap
  d'origine dans `docs/HISTORIQUE-ROADMAP.md`. Le rituel de clôture écrit désormais le compte
  rendu daté dans `JOURNAL.md`, **pas** dans `TASKS.md`. Ne reviens pas en arrière là-dessus.

L'ordre ci-dessous n'est pas indicatif : **l'infrastructure doit précéder le code**. Déployer
du code qui interroge des tables absentes ou un bucket non lié casse un site qui marche.

---

## Phase 1 — Correctif sécurité (code pur, pas de production)

**🔴 Bug critique, consigné dans `TASKS.md`. C'est la première chose à faire, avant tout le
reste.**

Quatre appels écrivent `env.SESSION_SECRET || ""` :

| Fichier | Lignes |
|---|---|
| `functions/_lib/session.js` | 48, 71 |
| `functions/_lib/csrf.js` | 30 |
| `functions/_lib/fileAccess.js` | 24, 31 |

Si la variable d'environnement est absente, mal nommée, ou oubliée sur un environnement
Cloudflare, le repli n'est pas une erreur : c'est **la chaîne vide comme clé HMAC**. Jetons de
session forgeables, jetons CSRF forgeables, liens de téléchargement signés forgeables — par
n'importe qui, puisque la clé est connue. Et rien ne le signale : pas de log, pas de page
d'erreur, pas de test rouge.

Correction attendue, **en famille, pas un site d'appel à la fois** (`CONSTITUTION.md` §5) :

- un helper unique (par exemple `functions/_lib/secrets.js`) qui lit le secret et **lève** une
  erreur explicite si la valeur est absente, vide, ou plus courte qu'un seuil raisonnable que
  tu fixes et justifies ;
- les trois modules passent par lui ; plus aucun `|| ""` nulle part ;
- **un test par module** qui échoue avant la correction et passe après — un environnement sans
  `SESSION_SECRET` doit faire échouer la requête bruyamment, pas la servir avec une clé vide ;
- vérifie le **même motif de repli silencieux sur `ADMIN_SECRET_HASH`** et sur toute autre
  variable d'environnement sensible, et traite-les dans le même mouvement s'il y en a.

Rituel de non-régression complet, puis commit.

## Phase 2 — Attestation de fin de parcours (code pur, pas de production)

Dernier élément fonctionnel manquant de la Mission 23 (`missions/MISSION-23.md` §Étape 5) :
attestation PDF nominative, générée quand 100 % des leçons d'une formation sont terminées.

- Elle n'a **aucune valeur officielle** : le dire explicitement **sur le document lui-même**,
  pas seulement dans l'interface. L'académie n'est pas un organisme certificateur et l'agrément
  n'est pas délivré — ce point n'est pas négociable.
- Nom de l'étudiant, titre de la formation, date d'obtention.
- Générée à la demande, pas stockée dans D1 ; le nom de l'étudiant ne sort pas vers un service
  tiers.
- Accessible uniquement à l'étudiant concerné, session vérifiée.
- Cohérente avec `docs/DESIGN-SYSTEM.md`.

Tests + rituel de non-régression, puis commit.

## Phase 3 — Préparer l'infrastructure (🛑 points d'arrêt)

### 3.1 — Bucket R2

Le binding R2 **n'existe pas** dans `wrangler.jsonc` : seul `DB` y est déclaré. En local, le
bucket est simulé par `--r2 CONTENT` (voir README §démarrage local), donc le nom de binding
attendu par le code est `CONTENT`.

Rappel historique à ne pas répéter : **`wrangler.jsonc` est lu par Cloudflare en production et
prime sur le dashboard.** Un `database_id` placeholder y a fait échouer deux déploiements
consécutifs en juillet. Ce que tu écris dans ce fichier part en production tel quel.

**🛑 STOP 1** — Montre-moi : le nom de bucket que tu proposes, la commande
`wrangler r2 bucket create ...` exacte, et le diff exact de `wrangler.jsonc`. Attends mon
accord avant d'exécuter quoi que ce soit.

### 3.2 — `SESSION_SECRET` en production

**Tu ne génères pas ce secret, tu ne le lis pas, tu ne l'écris nulle part.** C'est Massy qui le
génère et le colle dans les variables d'environnement du projet Pages, comme pour
`ADMIN_SECRET_HASH`.

**🛑 STOP 2** — Donne-moi la marche à suivre exacte : comment générer une valeur solide, le
chemin précis dans le dashboard Cloudflare, le nom exact de la variable, et sur quels
environnements la définir (production **et** preview — une preview qui retombe sur la chaîne
vide est une porte ouverte au même titre). Attends que je confirme que c'est fait.

### 3.3 — Migrations en production

`0002_platform_users.sql` et `0003_audit_log.sql` n'ont **jamais** été appliquées à la base
distante. Les tables `users`, `courses`, `modules`, `lessons`, `enrollments`,
`lesson_progress`, `audit_log` n'existent pas en production.

**🛑 STOP 3** — Montre-moi les commandes `wrangler d1 execute gds-licences --remote --file=...`
exactes, dans l'ordre (0002 puis 0003), et dis-moi si elles sont rejouables sans dégât en cas
d'échec à mi-parcours. Attends mon accord, puis exécute-les et montre-moi le résultat réel.

**Ne pousse rien tant que 3.1, 3.2 et 3.3 ne sont pas confirmés faits.**

## Phase 4 — Déploiement (🛑 point d'arrêt)

**🛑 STOP 4** — Récapitule en quelques lignes : ce qui part en ligne, ce qui change pour un
visiteur actuel, et ce qui casse si l'une des trois étapes de la Phase 3 a été mal faite.
Attends mon « vas-y » explicite, puis `git push`.

Ensuite, surveille le déploiement Cloudflare **jusqu'à son terme** et montre-moi le résultat.
S'il échoue, lis le log de build réel avant de proposer quoi que ce soit — ne devine pas.

## Phase 5 — Vérification par l'usage, puis clôture

C'est le seul moment de cette session où le pilotage de navigateur est justifié : garde-le pour
les critères d'acceptation, une fois, à la fin. En débogage, un test écrit coûte mille fois
moins cher — c'est le poste de dépense qui a épuisé la limite hebdomadaire la dernière fois.

Vérifie **en production**, contre les critères d'acceptation de `missions/MISSION-23.md` :

- [ ] un étudiant crée un compte, s'inscrit, suit des leçons, et sa progression persiste entre
      deux connexions ;
- [ ] une formation complète se crée depuis `/admin` (vidéo, PDF, fichier, session live) ;
- [ ] un document payant n'est pas accessible par simple partage d'URL ;
- [ ] le terminal et les exercices sont **strictement inchangés**, en mode libre comme en mode
      cours — test obligatoire, comme en Mission 08 ;
- [ ] l'accès par clé de licence existant fonctionne toujours (ne pas casser ce qui était déjà
      vendable) ;
- [ ] l'attestation se génère à 100 % de progression et porte bien sa mention de non-valeur
      officielle.

Puis rituel de clôture complet (`missions/README.md` §Règles d'exécution point 3) : suites
vertes, lint, typecheck, budgets de performance, checklist sécurité, **entrée datée en haut de
`JOURNAL.md`**, mise à jour de `TASKS.md` §En cours et de `CLAUDE.md`, et la reprise exacte pour
la suite — qui sera la **Mission 22** (paiement Chargily + envoi automatique de la clé ;
l'envoi réel demandera de vérifier `orionisacademy.com` chez Resend ou Brevo, **ne commence rien
là-dessus ici**).

## Ce que tu ne fais pas

- Aucun `git push` avant le **🛑 STOP 4**.
- Tu ne génères, ne lis et n'écris jamais `SESSION_SECRET` ni la phrase secrète admin.
- Pas de Mission 22, 24 ni 25. Une bonne idée hors périmètre se note dans `TASKS.md` §Backlog.
- Pas de compte rendu daté dans `TASKS.md` — il va dans `JOURNAL.md`.
- Ne laisse aucun serveur `wrangler`/`workerd` en vie en fin de session.

Si tu arrives en limite de session, arrête-toi **entre deux phases, jamais au milieu d'une**,
commite ce qui est vert, et écris la reprise exacte. L'état le plus dangereux serait une
infrastructure à moitié configurée avec du code poussé par-dessus.

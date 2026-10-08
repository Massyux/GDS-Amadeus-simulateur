# Prompt pour Claude Code — Mission 23, suite (sécurisation du travail + Étape 4)

> À coller tel quel dans Claude Code. Rédigé par l'architecte le 09/10/2026 après inspection
> directe de l'arbre de travail (`git status`) et du dashboard Cloudflare.

---

Bonjour. Session de suite sur la **Mission 23**. Lis d'abord `CONSTITUTION.md`, `CLAUDE.md`,
`TASKS.md` et `missions/MISSION-23.md` — le **mode autonome** (§MODE AUTONOME) s'applique
intégralement : tu ne t'arrêtes pas pour me demander une couleur, un libellé ou une structure,
tu tranches selon `docs/DESIGN-SYSTEM.md` et `docs/SECURITE.md`, tu consignes la décision dans
le commit, et tu continues. **Tu ne déploies rien en production** (règle 3) : la production
actuelle doit continuer à fonctionner à l'identique.

## A. Priorité absolue : sécuriser le travail non commité

L'arbre de travail contient **une session entière de travail non commitée** : 19 fichiers
modifiés et au moins 10 fichiers non suivis, dont tout le back-office qui semble déjà commencé
(`functions/api/admin/courses|modules|lessons`, `functions/api/admin/upload.js`,
`functions/_lib/auditLog.js`, `apps/web/src/admin/CoursesAdmin.jsx` — 634 lignes —,
`AuditLogView.jsx`, `Breadcrumb.jsx`, `LessonExercisePanel.jsx`, `LessonSimulatorView.jsx`).
Le dernier commit date du 08/10/2026 (`85af9b5`).

C'est un risque réel : une panne, une mauvaise commande et une journée disparaît. **Avant
d'écrire la moindre ligne nouvelle :**

1. Fais tourner le rituel de non-régression complet (les suites, lint, typecheck, build).
2. Si tout est vert, commite ce travail en autant de commits cohérents que nécessaire, avec des
   messages qui disent ce qui a été fait et pourquoi. Ne fais pas un commit fourre-tout.
3. Si quelque chose est rouge, **corrige d'abord**, et traite le bug avec toute sa famille
   (`CONSTITUTION.md` §5 : jamais un bug en isolation), avec un test qui échouait avant.
4. `AUDIT.md` (non suivi, audit du 05/10/2026) : décide s'il entre dans le dépôt ou pas, et dis
   pourquoi en une ligne dans `TASKS.md`. Ne le laisse pas en suspens une session de plus.

## B. Dis-moi honnêtement où en est l'Étape 4

`TASKS.md` annonce « reprise exacte : Étape 4 », mais le code non commité contient déjà une
bonne partie d'un back-office. Je ne sais pas ce qui marche et ce qui est une ébauche, et je
ne veux pas de supposition.

Établis l'état réel en le **vérifiant**, pas en lisant le code : lance l'environnement local
(`wrangler pages dev` + D1 + R2 local), et mesure l'Étape 4 contre son unique critère
d'acceptation, qui est un critère d'usage et pas de code :

> **Massy crée une formation de test complète — une leçon vidéo, un PDF, un document à
> télécharger, une session live — sans aide et sans écrire une ligne de code.**

Écris dans `TASKS.md` ce qui passe ce test aujourd'hui et ce qui ne le passe pas. Classe chaque
manque selon `CONSTITUTION.md` §5 (bug critique / incohérence fonctionnelle / amélioration
recommandée / idée d'évolution). Puis termine ce qui manque.

Rappels de ce que l'Étape 4 doit couvrir, d'après `missions/MISSION-23.md` :

- créer / modifier / **réordonner** formations, modules et leçons ; publier / dépublier ;
- téléverser PDF et documents vers **R2**, avec **liens signés à durée limitée** — un document
  payant ne doit pas être accessible par simple partage d'URL (`docs/SECURITE.md` §5, et c'est
  un critère d'acceptation de la mission, pas une option) ;
- coller une URL vidéo (YouTube/Vimeo non répertorié — on n'héberge pas de vidéo) ;
- programmer une session **live** avec sa date, son heure, sa durée et son lien, le lien
  n'étant visible qu'aux inscrits ;
- le back-office remplace `scripts/seed-dev-course.sql` comme moyen de créer une formation.

Contraintes qui ne se négocient pas : authentification admin existante (phrase secrète,
`ADMIN_SECRET_HASH`), requêtes préparées uniquement, aucun binaire dans D1 ni dans le dépôt,
le type de leçon `quiz` reste déclaré sans être implémenté (Mission 24), `score`/`max_score`
restent en place sans être remplis.

## C. Nouveauté depuis ta dernière session : le domaine est acheté et en ligne

Fait, par moi, aujourd'hui — vérifié dans le dashboard Cloudflare :

- **`orionisacademy.com` et `www.orionisacademy.com` sont des domaines personnalisés actifs sur
  le projet Pages `gds-amadeus-simulateur`, SSL émis.** L'URL canonique du produit est désormais
  **https://orionisacademy.com**. `gds-amadeus-simulateur.pages.dev` continue de répondre mais
  n'est plus l'adresse de référence.
- **Email Routing est actif** sur la zone, une règle : `contact@orionisacademy.com` →
  `orionisvoyage@gmail.com`. ⚠️ Email Routing **reçoit seulement** : envoyer un e-mail
  (clé de licence automatique) demandera Resend ou Brevo avec vérification SPF/DKIM — c'est la
  Mission 22, **ne commence rien là-dessus**.

Tâche bornée, à faire dans cette session : **remplace `gds-amadeus-simulateur.pages.dev` par
`orionisacademy.com` partout où une URL en dur traîne** — métadonnées SEO (`canonical`,
`og:url`), `robots.txt`/`sitemap` s'ils existent, README, docs. Ne touche à rien d'autre à cette
occasion : c'est un remplacement d'URL, pas une passe SEO. Si tu constates qu'il n'existe ni
`canonical`, ni `og:*`, ni sitemap, **ne les crée pas ici** — note-le dans `TASKS.md` comme
« amélioration recommandée » pour une passe SEO dédiée, et continue.

## D. Ce que tu ne fais pas

- Pas de déploiement en production, pas de `wrangler ... --remote`, pas de modification de
  `wrangler.jsonc` (le binding R2 réel et `SESSION_SECRET` se feront avec moi en Étape 5).
- Pas de Mission 24 (quiz, notation) ni de Mission 25 (assistant IA) — seulement ne pas se
  fermer la porte, comme prévu.
- Pas d'élargissement de périmètre. Une bonne idée qui n'est pas dans l'Étape 4 se note dans
  `TASKS.md` en « idée d'évolution » et ne s'implémente pas.
- Ne laisse pas tourner de serveurs `wrangler`/`workerd` en fin de session : la dernière fois,
  une cinquantaine de processus orphelins ont saturé la machine. Arrête ce que tu as lancé.

## E. Clôture

Rituel complet avant de considérer l'étape finie (`missions/README.md` §Règles d'exécution,
point 3 — c'est l'oubli de ce rituel qui a fait croire pendant deux mois que la Mission 14
n'était pas terminée) : suites vertes, lint, typecheck, budgets de performance mesurés,
checklist sécurité, puis **mise à jour de `TASKS.md`, `CLAUDE.md` et `PROJECT_MEMORY`** avec la
reprise exacte pour la session suivante.

Si tu arrives en limite de session avant la fin, commite ce qui est vert et écris la reprise
exacte. Ne laisse jamais une journée de travail non commitée comme c'est le cas aujourd'hui.
